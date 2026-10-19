#!/usr/bin/env node
/**
 * Staged JST hourly news publisher (independent from evergreen 20:00 workflow).
 * NEVER converts an RSS candidate, draft, review, or merely-ready story to public.
 * Requires an explicit site-owner-approved record bound to immutable bytes.
 */
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {parse,stringify} from "yaml";
import {fileURLToPath} from "node:url";
import {buildNewsArchive,archiveJson,archiveCsv} from "./build-news-archive.mjs";

const idRe=/^NEWS-\d{4}$/;
const slugRe=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const dateRe=/^\d{4}-\d{2}-\d{2}$/;
const rootFile=(root,file)=>path.join(root,file);
const fileText=(root,file)=>fs.readFileSync(rootFile(root,file),"utf8");
const yaml=(root,file)=>parse(fileText(root,file));
function gitSha(s){
  const b=Buffer.from(s.replace(/\r\n/g,"\n"),"utf8");
  return createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");
}
function validDate(date){
  return typeof date==="string"&&dateRe.test(date)&&
    !Number.isNaN(Date.parse(date+"T00:00:00Z"))&&
    new Date(date+"T00:00:00Z").toISOString().slice(0,10)===date;
}
function japanDate(now){
  const parts=new Intl.DateTimeFormat("en-US",{
    timeZone:"Asia/Tokyo",year:"numeric",month:"2-digit",day:"2-digit",
  }).formatToParts(now);
  const val=t=>parts.find(x=>x.type===t)?.value;
  return [val("year"),val("month"),val("day")].join("-");
}
function fail(message){throw Error("News release blocked: "+message);}
function articleParts(raw,slug){
  const m=raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if(!m)fail("bad frontmatter "+slug);
  const metadata=parse(m[1]);
  if(!metadata||typeof metadata!=="object")fail("bad metadata "+slug);
  return {rawFrontmatter:m[1],originalPrefix:m[0],body:raw.slice(m[0].length),metadata};
}
function registryBlock(raw,id){
  const marker='\n  - id: "'+id+'"\n';
  const start=raw.indexOf(marker);
  if(start<0)fail("missing news Registry node "+id);
  const next=raw.indexOf("\n  - id:",start+marker.length);
  const end=next<0?raw.length:next;
  return {start,end,text:raw.slice(start,end)};
}
function approvedUrl(raw){
  try{
    const u=new URL(raw);
    return u.protocol==="https:"&&!u.username&&!u.password&&!u.port &&
       (u.hostname.includes(".")||u.hostname==="localhost")&&u.href===raw;
  }catch{return false;}
}
function validatedMedia(root,item,image){
  const url="/images/news/"+item.slug+".webp";
  if(image!==url)fail("unapproved or missing local hero "+item.id);
  const asset=rootFile(root,"public"+url);
  if(!fs.existsSync(asset))fail("hero not materialized "+item.id);
  const data=fs.readFileSync(asset);
  if(data.subarray(0,4).toString()!=="RIFF"||data.subarray(8,12).toString()!=="WEBP"||
     data.length<20000||data.length>500000)
    fail("invalid WebP "+item.id);
  if(createHash("sha256").update(data).digest("hex")!==item.heroSha256)
    fail("hero differs from site-owner approval "+item.id);
}
// Each Japan-local hour is an exclusive reservation. A delayed retry must
// never consume another story from a previously elapsed hour.
const hours=(from,to)=>Array.from({length:to-from+1},(_,i)=>
  String(from+i).padStart(2,"0")+":00");
const CANONICAL_NEWS_PHASES={
  "pilot-2":{maximumPostsPerDay:2,slotsJst:["09:00","18:00"]},
  "growth-6":{maximumPostsPerDay:6,slotsJst:["07:00","09:00","12:00","15:00","18:00","21:00"]},
  "hourly-17":{maximumPostsPerDay:17,slotsJst:hours(7,23)},
};
const validHourlySlot=(raw)=>
  typeof raw==="string" && /^\d{4}-\d{2}-\d{2}T(?:0[7-9]|1\d|2[0-3]):00:00\+09:00$/.test(raw) &&
  validDate(raw.slice(0,10)) && Number.isFinite(Date.parse(raw));
export function activeNewsCadence(cadence) {
  if(cadence?.schemaVersion!==2 || cadence?.timezone!=="Asia/Tokyo" ||
     !Object.hasOwn(CANONICAL_NEWS_PHASES,cadence.activePhase) ||
     !cadence.phases || Object.keys(cadence.phases).sort().join(",")!==
       Object.keys(CANONICAL_NEWS_PHASES).sort().join(",") ||
     cadence.hourlyWindowJst!=="07:00-23:00")
    fail("malformed staged news cadence");
  for(const [phase,expected] of Object.entries(CANONICAL_NEWS_PHASES)){
    const actual=cadence.phases[phase];
    if(actual?.maximumPostsPerDay!==expected.maximumPostsPerDay ||
       JSON.stringify(actual.slotsJst)!==JSON.stringify(expected.slotsJst) ||
       actual.slotsJst.length!==actual.maximumPostsPerDay)
      fail("unsafe or unreviewed news phase limits: "+phase);
  }
  const active=cadence.phases[cadence.activePhase];
  if(cadence.targetApprovedPostsPerDay!==active.maximumPostsPerDay)
    fail("active target mismatches approved rollout phase");
  return active;
}

export function assertUniqueNewsSlots(approvals) {
  if (!Array.isArray(approvals)) fail("invalid slot ledger");
  const seen=new Set();
  for (const entry of approvals) {
    const slot=entry?.scheduledAtJst;
    if (typeof slot!=="string" ||
        !validHourlySlot(slot) ||
        !Number.isFinite(Date.parse(slot)))
      fail("invalid scheduled news slot");
    if (seen.has(slot)) fail("multiple news approvals for one slot "+slot);
    seen.add(slot);
  }
}

export function chooseNewsRelease(root=process.cwd(),now=new Date()) {
  if(!(now instanceof Date)||!Number.isFinite(now.getTime()))fail("invalid clock");
  const cadence=yaml(root,"content/news/news-cadence.yml");
  const ledger=yaml(root,"content/news/news-approval-queue.yml");
  const history=yaml(root,"content/news/news-publication-log.yml");
  const registry=yaml(root,"content/registry/knowledge-nodes.yml");
  const decisions=yaml(root,"content/news/news-editorial-decisions.yml");
  const active=activeNewsCadence(cadence);
  if(ledger?.schemaVersion!==1||!Array.isArray(ledger.approvals)||
     !Array.isArray(history?.releases)||!Array.isArray(decisions?.decisions)||
     !Array.isArray(registry?.nodes)||registry.nodeCount!==registry.nodes.length)
    fail("malformed source-of-truth records or cadence");
  assertUniqueNewsSlots(ledger.approvals);
  const today=japanDate(now);
  const publishedToday=history.releases.filter(x=>x.decision==="published"&&x.publishOn===today).length+
    ledger.approvals.filter(x=>x.decision==="published"&&x.publishedOn===today).length;
  const seen=new Set(),slugs=new Set();
  const candidates=[];
  for(const row of ledger.approvals){
    if(!idRe.test(row.id||"")||!slugRe.test(row.slug||"")||seen.has(row.id)||slugs.has(row.slug)||
       !["approved-for-publication","published"].includes(row.decision)||
       !validDate(row.approvedOn)||row.approvedBy!=="site-owner"||
       !String(row.evidence||"").trim()||
       !/^[a-f0-9]{40}$/.test(row.sourceReadyBlob||"")||
       !/^[a-f0-9]{64}$/.test(row.heroSha256||"")||
       !approvedUrl(row.originalUrl)||!validDate(row.scheduledAtJst?.slice(0,10)))
      fail("invalid or duplicate owner news approval "+String(row.id));
    seen.add(row.id);slugs.add(row.slug);
    const time=row.scheduledAtJst;
    if(!validHourlySlot(time) || !Number.isFinite(Date.parse(time)))
      fail("approved time not in one of the two Japan slots "+row.id);
    if(row.auditPath!=="content/news/editorial-audits/"+row.id+".md"||
       !fs.existsSync(rootFile(root,row.auditPath)))
      fail("missing editorial audit "+row.id);
    const node=registry.nodes.find(x=>x.id===row.id);
    if(!node||node.slug!==row.slug||node.category!=="AIニュース"||node.type!=="news")
      fail("approval not mapped to AI news "+row.id);
    const rel="content/articles/"+row.slug+".md";
    const article=fileText(root,rel);
    const {rawFrontmatter,originalPrefix,body,metadata}=articleParts(article,row.slug);
    if(row.decision==="published"){
      if(node.status!=="published"||metadata.status!=="published"||
         !validDate(row.publishedOn)||metadata.publishedAt!==row.publishedOn)
        fail("published queue ledger drift "+row.id);
      continue;
    }
    if(node.status!=="ready"||metadata.status!=="ready"||metadata.id!==row.id||
       metadata.category!=="AIニュース"||metadata.type!=="news"||metadata.adPolicy!=="off")
      fail("news not owner-approved ready manuscript "+row.id);
    if(gitSha(article)!==row.sourceReadyBlob)fail("ready manuscript was altered "+row.id);
    if(!body.includes(row.originalUrl))fail("approved primary source not in article "+row.id);
    if(body.length<350||body.length>1300)fail("one-minute news editorial bound "+row.id);
    validatedMedia(root,row,metadata.thumbnail);
    if(decisions.decisions.some(d=>d.status==="rejected" &&
       (d.id===row.id||d.slug===row.slug||d.primarySource===row.originalUrl)))
      fail("rejected article or source reused "+row.id);
    if(history.releases.some(d=>d.slug===row.slug||d.primarySource===row.originalUrl)||
       ledger.approvals.some(d=>d!==row&&d.originalUrl===row.originalUrl))
      fail("duplicate published or queued source "+row.id);
    for(const dep of node.prerequisites||[])
      if(registry.nodes.find(n=>n.id===dep)?.status!=="published")
        fail("unpublished prerequisite "+dep);
    for(const match of body.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g))
      if(!registry.nodes.some(n=>n.slug===match[1]&&n.status==="published"))
        fail("CTA leads to unpublished lesson "+match[1]);
    candidates.push({row,node,rel,article,rawFrontmatter,originalPrefix,body,metadata});
  }
  if(publishedToday>=active.maximumPostsPerDay)
    return {changed:false,reason:"News quota reached for "+today,availableSlots:0};
  // GitHub cron may be delayed or dropped. A retry may only release the
  // currently active JST hour on its ORIGINAL date. Never backfill another
  // hour or yesterday's missed news from a later scheduled retry.
  const hour=Number(new Intl.DateTimeFormat("en-GB",{
    timeZone:"Asia/Tokyo",hour:"2-digit",hourCycle:"h23",
  }).format(now));
  const activeSlot=hour>=7 && hour<=23 ? String(hour).padStart(2,"0")+":00" : null;
  const permittedSlot=activeSlot && active.slotsJst.includes(activeSlot) ? activeSlot : null;
  const activeScheduledAt=permittedSlot ? today+"T"+permittedSlot+":00+09:00" : null;
  const eligible=candidates.filter(c=>activeScheduledAt!==null &&
    c.row.scheduledAtJst===activeScheduledAt &&
    Date.parse(c.row.scheduledAtJst)<=now.getTime())
    .sort((a,b)=>a.row.scheduledAtJst.localeCompare(b.row.scheduledAtJst)||a.row.id.localeCompare(b.row.id));
  const selected=eligible[0];
  if(!selected)return {changed:false,reason:"No date-due, explicitly approved news",availableSlots:active.maximumPostsPerDay-publishedToday};
  return {changed:false,eligible:selected.row.id,slug:selected.row.slug,
    availableSlots:active.maximumPostsPerDay-publishedToday,selected,today,ledger,registry};
}
export function publishNews(root=process.cwd(),options={}) {
  const result=chooseNewsRelease(root,options.now||new Date());
  if(!result.selected || !options.apply)return {...result,selected:undefined};
  const {selected:{row,rel,article,rawFrontmatter,originalPrefix,body,metadata},
    today,ledger}=result;
  const regRel="content/registry/knowledge-nodes.yml";
  const registryRaw=fileText(root,regRel);
  const b=registryBlock(registryRaw,row.id);
  const updatedBlock=b.text.replace(/^    status: "ready"$/m,'    status: "published"');
  if(updatedBlock===b.text)fail("registry promotion did not change "+row.id);
  const newReg=registryRaw.slice(0,b.start)+updatedBlock+registryRaw.slice(b.end);
  let fm=rawFrontmatter.replace(/^status: "ready"$/m,'status: "published"');
  fm=fm.replace(/^publishedAt: "[^"]+"$/m,'publishedAt: "'+today+'"');
  fm=fm.replace(/^updatedAt: "[^"]+"$/m,'updatedAt: "'+today+'"');
  if(fm===rawFrontmatter||!fm.includes('status: "published"'))fail("cannot promote frontmatter");
  const promoted="---\n"+fm+"\n---\n"+body;
  if(promoted.slice(promoted.indexOf("\n---\n")+5)!==body)fail("body changed");
  row.decision="published";row.publishedOn=today;
  const updatedLedger=stringify(ledger);
  fs.writeFileSync(rootFile(root,rel),promoted);
  fs.writeFileSync(rootFile(root,regRel),newReg);
  fs.writeFileSync(rootFile(root,"content/news/news-approval-queue.yml"),updatedLedger);
  const archive=buildNewsArchive(root);
  fs.writeFileSync(rootFile(root,"content/news/news-archive.json"),archiveJson(archive));
  fs.writeFileSync(rootFile(root,"content/news/news-archive.csv"),archiveCsv(archive));
  return {changed:true,id:row.id,slug:row.slug,publishedOn:today};
}
const invoked=process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]);
if(invoked){
  const args=process.argv.slice(2);
  if(args.length!==1||!["--check","--apply"].includes(args[0]))
    fail("Usage: node scripts/publish-news-queue.mjs --check|--apply");
  const r=publishNews(process.cwd(),{apply:args[0]==="--apply"});
  console.log(JSON.stringify(r));
  if(process.env.GITHUB_OUTPUT)
    fs.appendFileSync(process.env.GITHUB_OUTPUT,"changed="+Boolean(r.changed)+"\n"+
      (r.slug?"slug="+r.slug+"\n":""));
}
