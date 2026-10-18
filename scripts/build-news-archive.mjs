#!/usr/bin/env node
/**
 * Git-owned news archive. Deterministic JSON/CSV derived from original articles,
 * the Registry, owner approval ledgers and editorial rejection decisions.
 * The archive is NOT a new public news source or permission to publish.
 */
import fs from "node:fs";
import path from "node:path";
import {parse} from "yaml";
import {fileURLToPath} from "node:url";

const p=(root,relative)=>path.join(root,relative);
const readYaml=(root,relative)=>parse(fs.readFileSync(p(root,relative),"utf8"));
const sourceRe=/\]\((https:\/\/[^)\s]+)\)/g;
const ctaRe=/\]\(\/articles\/([a-z0-9]+(?:-[a-z0-9]+)*)\)/g;
const articleDir="content/articles";
const indexPath="content/news/news-archive.json";
const csvPath="content/news/news-archive.csv";
const uniq=arr=>[...new Set(arr)];
function parsedArticle(raw,filename) {
  const match=raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if(!match)throw Error("Missing Markdown frontmatter: "+filename);
  const meta=parse(match[1]);
  if(!meta||typeof meta!=="object"||!meta.slug||!meta.title)
    throw Error("Invalid Markdown frontmatter: "+filename);
  return {meta,body:raw.slice(match[0].length)};
}
function urlsFromMarkdown(body) {
  return uniq([...body.matchAll(sourceRe)].map(match=>{
    try {
      const u=new URL(match[1]);
      if(u.protocol!=="https:"||u.username||u.password)return null;
      u.hash="";
      [...u.searchParams.keys()].filter(x=>x.startsWith("utm_")).forEach(x=>u.searchParams.delete(x));
      return u.toString();
    }catch{return null;}
  }).filter(Boolean));
}
function normalizeUrl(url) {
  try {
    const u=new URL(url);
    if(u.protocol!=="https:"||u.username||u.password)return null;
    u.hash="";
    // OpenAI's RSS can link to /index/<slug> while its localized release
    // uses /ja-JP/index/<slug>. This is only a duplicate-review hint, never
    // authorization to merge, suppress or publish a story.
    if (u.hostname === "openai.com")
      u.pathname=u.pathname.replace(/^\/[a-z]{2}-[A-Z]{2}(?=\/index\/)/,"");
    u.pathname=u.pathname.replace(/\/+$/,"")||"/";
    for(const name of [...u.searchParams.keys()])if(name.toLowerCase().startsWith("utm_"))u.searchParams.delete(name);
    return u.toString();
  }catch{return null;}
}
const fingerprint=s=>String(s||"").normalize("NFKC").toLowerCase()
  .replace(/[\p{P}\p{S}\s]+/gu,"");
export function buildNewsArchive(root=process.cwd()) {
  const registry=readYaml(root,"content/registry/knowledge-nodes.yml");
  const historical=readYaml(root,"content/news/news-publication-log.yml");
  const queue=readYaml(root,"content/news/news-approval-queue.yml");
  const decisions=readYaml(root,"content/news/news-editorial-decisions.yml");
  const sources=JSON.parse(fs.readFileSync(p(root,"content/news/sources.json"),"utf8")).sources;
  if(!Array.isArray(registry?.nodes)||registry.nodes.length!==registry.nodeCount ||
    !Array.isArray(historical?.releases)||queue?.schemaVersion!==1||!Array.isArray(queue.approvals)||
    decisions?.schemaVersion!==1||!Array.isArray(decisions.decisions))
    throw Error("Invalid news registry, publication log, approval queue or decision log");
  const nodes=new Map(registry.nodes.map(node=>[node.slug,node]));
  const legacy=new Map(historical.releases.map(x=>[x.id,x]));
  const queued=new Map(queue.approvals.map(x=>[x.id,x]));
  const entries=[],ids=new Set(),slugs=new Set();
  for(const name of fs.readdirSync(p(root,articleDir)).filter(x=>x.endsWith(".md")).sort()) {
    const relative=articleDir+"/"+name;
    const {meta,body}=parsedArticle(fs.readFileSync(p(root,relative),"utf8"),relative);
    if(meta.category!=="AIニュース" && meta.type!=="news")continue;
    const node=nodes.get(meta.slug);
    const id=meta.id||node?.id;
    if(!node||node.id!==id||node.category!=="AIニュース"||
       node.status!==(meta.status||"published"))
      throw Error("News article/Registry mismatch: "+relative);
    if(ids.has(id)||slugs.has(meta.slug))throw Error("Duplicate indexed news "+id);
    ids.add(id);slugs.add(meta.slug);
    const sourceUrls=urlsFromMarkdown(body);
    const sourceIds=uniq(sourceUrls.flatMap(url=>{
      const host=new URL(url).hostname;
      return sources.filter(x=>x.allowedHosts.some(allow=>host===allow||host.endsWith("."+allow))).map(x=>x.id);
    }));
    const approval=queued.get(id)||legacy.get(id);
    entries.push({
      id,slug:meta.slug,title:meta.title,status:node.status,
      topic:node.centerQuestion||"",description:meta.description||"",
      publishedAt:node.status==="published"?meta.publishedAt:null,
      updatedAt:meta.updatedAt||null,
      scheduledAtJst:queued.get(id)?.scheduledAtJst||null,
      sourceUrls,sourceIds,
      primarySource:approval?.originalUrl||approval?.primarySource||sourceUrls[0]||null,
      ctaSlugs:uniq([...body.matchAll(ctaRe)].map(m=>m[1])),
      image:meta.thumbnail||null,
      approvalState:approval?.decision||null,
      approvalEvidence:approval?.evidence||null,
      publishedReleaseAtJst:approval?.releaseSlotJst||null,
      articlePath:relative,
      articleUrl:node.status==="published"?"https://aiportal.blog/articles/"+meta.slug:null
    });
  }
  const rejectedIds=new Set();
  for(const d of decisions.decisions) {
    if(d.status!=="rejected"||!/^NEWS-\d{4}$/.test(d.id||"")||
       !d.slug||!d.primarySource||!d.reason)
      throw Error("Malformed rejected news decision");
    if(rejectedIds.has(d.id)||ids.has(d.id)||slugs.has(d.slug))
      throw Error("Reused rejected news identity: "+d.id);
    rejectedIds.add(d.id);
    entries.push({
      id:d.id,slug:d.slug,title:d.title,status:"rejected",
      topic:d.reason,description:"",publishedAt:null,updatedAt:null,
      scheduledAtJst:null,sourceUrls:[d.primarySource],sourceIds:[],
      primarySource:d.primarySource,ctaSlugs:[],image:null,
      approvalState:"rejected",approvalEvidence:d.reason,
      publishedReleaseAtJst:null,articlePath:null,articleUrl:null,
      retainedDraftPR:d.retainedDraftPR||null
    });
  }
  const order={published:0,ready:1,scheduled:1,review:2,draft:3,rejected:4};
  entries.sort((a,b)=>(order[a.status]??5)-(order[b.status]??5) ||
    (b.publishedAt||"").localeCompare(a.publishedAt||"")||
    a.id.localeCompare(b.id));
  const count=status=>entries.filter(x=>x.status===status).length;
  return {schemaVersion:1,sourceOfTruth:"GitHub main + content/news",
    summary:{total:entries.length,published:count("published"),
      ready:count("ready"),review:count("review"),rejected:count("rejected")},
    entries};
}
export function findNewsOverlaps(archive,{title="",originalUrl=""}={}) {
  const normalized=normalizeUrl(originalUrl), key=fingerprint(title);
  return archive.entries.filter(item=>{
    if(normalized&&(normalizeUrl(item.primarySource)===normalized||
       item.sourceUrls.some(url=>normalizeUrl(url)===normalized)))return true;
    return key && fingerprint(item.title)===key;
  }).map(item=>({id:item.id,status:item.status,slug:item.slug,title:item.title}));
}
const columns=["id","status","title","slug","publishedAt","scheduledAtJst",
  "primarySource","sourceUrls","sourceIds","ctaSlugs","image","articlePath","articleUrl",
  "approvalState"];
const csvQuote=value=>{
  const s=Array.isArray(value)?value.join(" | "):value==null?"":String(value);
  return '"'+s.replaceAll('"','""')+'"';
};
export function archiveJson(archive){return JSON.stringify(archive,null,2)+"\n";}
export function archiveCsv(archive) {
  return [columns.map(csvQuote).join(","),
    ...archive.entries.map(item=>columns.map(name=>csvQuote(item[name])).join(","))
  ].join("\n")+"\n";
}
const called=process.argv[1]&&fileURLToPath(import.meta.url)===path.resolve(process.argv[1]);
if(called) {
  const args=process.argv.slice(2);
  if(args.length!==1||!["--write","--check"].includes(args[0]))
    throw Error("Usage: node scripts/build-news-archive.mjs --write|--check");
  const root=process.cwd(), archive=buildNewsArchive(root);
  for(const [output,contents] of [[indexPath,archiveJson(archive)],[csvPath,archiveCsv(archive)]]) {
    if(args[0]==="--write")fs.writeFileSync(p(root,output),contents);
    else if(!fs.existsSync(p(root,output))||fs.readFileSync(p(root,output),"utf8")!==contents)
      throw Error("Stale tracked news archive: "+output+"; run npm run news:archive");
  }
  console.log("News archive:",archive.summary);
}
