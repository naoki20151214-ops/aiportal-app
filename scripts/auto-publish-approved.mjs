#!/usr/bin/env node
/**
 * Publication is date-gated: only the daily scheduled workflow (or manual recovery)
 * releases at most one approved and dependency-safe article per Japan calendar day.
 * Each new approval must carry publishOn YYYY-MM-DD in the approval ledger.
 * Editorial approval is a production-publication authorization.
 * Only explicit, durable approval records with decision
 * "approved-for-publication" are eligible. "ready" ALONE is not consent.
 * Read the merged main branch; never execute source code from a preview PR.
 */
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { createHash } from "node:crypto";
import { parse, stringify } from "yaml";
import { verifyDelegatedEditorialAudit } from "./delegated-editorial-gate.mjs";

const isId = (id) => /^(BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}$/.test(id);
const isSlug = (slug) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
// Bind a user-approved manuscript to its exact Git blob, including frontmatter.
// The staged ready file is hashed before publication; only approved status/date
// metadata can then change. Do not substitute a different edited manuscript.
function gitBlobSha(source) {
  return createHash("sha1")
    .update("blob " + Buffer.byteLength(source, "utf8") + "\0")
    .update(source, "utf8")
    .digest("hex");
}

function todayInJapan() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit"
  }).formatToParts(new Date());
  const field = name => parts.find(p => p.type === name)?.value;
  return [field("year"),field("month"),field("day")].join("-");
}
function file(root,rel){ return path.join(root,rel); }
function frontmatter(source,slug) {
  const m=source.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if(!m) throw new Error("Missing article frontmatter "+slug);
  const meta=parse(m[1]);
  if(!meta || typeof meta!=="object")throw new Error("Invalid frontmatter "+slug);
  return {match:m[0],raw:m[1],meta};
}
function block(src,id) {
  const mark='\n  - id: "'+id+'"\n';
  const start=src.indexOf(mark);
  const end=start<0?-1:src.indexOf("\n  - id:",start+mark.length);
  return start<0?null:{start,end:end<0?src.length:end,text:src.slice(start,end<0?src.length:end)};
}
function updateArticle(source,slug,date) {
  const {match,raw,meta}=frontmatter(source,slug);
  if(meta.status!=="ready")throw new Error("Not ready: "+slug);
  if(typeof meta.publishedAt!=="string"||typeof meta.updatedAt!=="string")
    throw new Error("Missing publication dates "+slug);
  let updated=raw.replace(/^status:\s*"ready"$/m,'status: "published"');
  if(updated===raw)throw new Error("Cannot update status "+slug);
  updated=updated.replace(/^publishedAt: ".*"$/m,'publishedAt: "'+date+'"');
  updated=updated.replace(/^updatedAt: ".*"$/m,'updatedAt: "'+date+'"');
  const replacement=match.replace(raw,updated);
  const result=replacement+source.slice(match.length);
  if(result.slice(replacement.length)!==source.slice(match.length))
    throw new Error("Article body changed "+slug);
  return result;
}
export function publishApproved(root,options={}) {
  const apply=options.apply===true;
  const date=options.date||todayInJapan();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))throw new Error("Invalid date");
  const ledgerPath="content/registry/article-approval-log.yml";
  const registryPath="content/registry/knowledge-nodes.yml";
  const ledgerText=fs.readFileSync(file(root,ledgerPath),"utf8");
  const registryText=fs.readFileSync(file(root,registryPath),"utf8");
  const ledger=parse(ledgerText),registry=parse(registryText);
  if(!Array.isArray(ledger?.approvals)||!Array.isArray(registry?.nodes)||
    registry.nodeCount!==registry.nodes.length)throw new Error("Malformed registry or approval ledger");
  const byId=new Map(registry.nodes.map(n=>[n.id,n]));
  const seen=new Set();
  const pending=[];
  const already=[];
  for(const row of ledger.approvals) {
    if(row.decision!=="approved-for-publication")continue;
    if(!isId(row.id)||!isSlug(row.slug)||!["site-owner","editorial-qa"].includes(row.approvedBy)||!String(row.evidence||"").trim()||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.approvedOn||""))
      throw new Error("Invalid explicit approval evidence: "+row.id);
    if(seen.has(row.id))throw new Error("Duplicate pending approval "+row.id);
    seen.add(row.id);
    if(typeof row.publishOn!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.publishOn) ||
      !Number.isFinite(Date.parse(row.publishOn+"T00:00:00Z")) ||
      new Date(row.publishOn+"T00:00:00Z").toISOString().slice(0,10)!==row.publishOn)
      throw new Error("Approved article requires valid publishOn (Asia/Tokyo YYYY-MM-DD): "+row.id);
    const node=byId.get(row.id);
    if(!node||node.slug!==row.slug)throw new Error("Unknown approval node: "+row.id);
    const articlePath="content/articles/"+row.slug+".md";
    if(!fs.existsSync(file(root,articlePath)))throw new Error("Approved article missing "+row.id);
    const source=fs.readFileSync(file(root,articlePath),"utf8");
    const fm=frontmatter(source,row.slug).meta;
    if(fm.id!==row.id||fm.slug!==row.slug)throw new Error("Approved ID/slug mismatch "+row.id);
    if(node.status==="published"&&fm.status==="published"){
      already.push(row);continue;
    }
    if(node.status!=="ready"||fm.status!=="ready")
      throw new Error("Approval status mismatch, refusing publication: "+row.id);
    if(!/^[a-f0-9]{40}$/.test(row.sourceArticleBlob||""))
      throw new Error("Missing approved ready article Git blob SHA: "+row.id);
    if(gitBlobSha(source)!==row.sourceArticleBlob)
      throw new Error("Approved source blob mismatch; manuscript changed after sign-off: "+row.id);
    if(row.approvedBy==="editorial-qa")
      verifyDelegatedEditorialAudit(root,row,source,node);
    if(typeof fm.thumbnail==="string"&&fm.thumbnail.startsWith("/")){
      if(fm.thumbnail.includes("..")||!fs.existsSync(file(root,"public"+fm.thumbnail)))
        throw new Error("Missing approved thumbnail "+row.id+" "+fm.thumbnail);
    }
    const refs=[...source.matchAll(/!\[[^\]]*\]\((\/images\/[^)\s]+)\)/g)].map(m=>m[1]);
    for(const ref of refs) {
      if(ref.includes("..")||!fs.existsSync(file(root,"public"+ref)))
        throw new Error("Missing approved illustration "+row.id+" "+ref);
    }
    const links=[...source.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(m=>m[1]);
    pending.push({row,node,articlePath,source,links});
  }
  // Work only on the maximal dependency-safe subset. Approved but blocked
  // nodes remain pending, so other accepted articles are never held hostage.
  const eligible=new Map(pending.map(p=>[p.node.id,p]));
  const existingPublishedSlugs=new Set(registry.nodes.filter(n=>n.status==="published").map(n=>n.slug));
  let changed=true;
  while(changed){
    changed=false;
    const effectiveSlugs=new Set([...existingPublishedSlugs,...[...eligible.values()].map(p=>p.node.slug)]);
    for(const [id,p] of [...eligible]) {
      const prerequisites=p.node.prerequisites||[];
      const depsOk=prerequisites.every(dep=>byId.get(dep)?.status==="published"||eligible.has(dep));
      const linksOk=p.links.every(slug=>effectiveSlugs.has(slug));
      if(!depsOk||!linksOk){eligible.delete(id);changed=true;}
    }
  }
  const publishedToday=ledger.approvals.filter(row =>
    row.decision==="published" && row.publishedOn===date).length;
  const availableSlugs=new Set(registry.nodes
    .filter(node=>node.status==="published").map(node=>node.slug));
  const due=pending.filter(p =>
    eligible.has(p.node.id) &&
    p.row.publishOn<=date &&
    (p.node.prerequisites||[]).every(dep=>byId.get(dep)?.status==="published") &&
    p.links.every(slug=>availableSlugs.has(slug))
  ).sort((a,b)=>a.row.publishOn.localeCompare(b.row.publishOn) ||
    a.row.approvedOn.localeCompare(b.row.approvedOn) ||
    a.node.id.localeCompare(b.node.id));
  const selected=publishedToday>=1?[]:due.slice(0,1);
  const selectedIds=new Set(selected.map(p=>p.node.id));
  const remaining=pending.filter(p=>!selectedIds.has(p.node.id)).map(p=>p.node.id);
  const updates=[];
  let newRegistry=registryText;
  for(const p of selected){
    const node=block(newRegistry,p.node.id);
    if(!node||!node.text.includes('    status: "ready"'))
      throw new Error("Cannot update Registry status "+p.node.id);
    newRegistry=newRegistry.slice(0,node.start)+node.text.replace('    status: "ready"','    status: "published"')+newRegistry.slice(node.end);
    updates.push([p.articlePath,updateArticle(p.source,p.node.slug,date)]);
    p.row.decision="published";
    p.row.publishedOn=date;
  }
  for(const row of already){row.decision="published";if(!row.publishedOn)row.publishedOn=date;}
  if(selected.length)updates.push([registryPath,newRegistry]);
  if(selected.length||already.length)updates.push([ledgerPath,stringify(ledger)]);
  if(apply)for(const [rel,content] of updates)fs.writeFileSync(file(root,rel),content,"utf8");
  return {published:selected.map(p=>p.node.id),deferred:remaining,already:already.map(x=>x.id),files:updates.map(x=>x[0]),applied:apply, publishedToday};
}
if(process.argv[1] && path.resolve(process.argv[1])===path.resolve(new URL(import.meta.url).pathname)){
  try{
    const result=publishApproved(process.cwd(),{apply:process.argv.includes("--apply")});
    console.log(JSON.stringify(result));
    if(process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT,
      "changed="+(result.files.length?"true":"false")+"\n");
  }catch(error){ console.error("AUTOPUBLISH BLOCKED: "+error.message);process.exitCode=1; }
}
