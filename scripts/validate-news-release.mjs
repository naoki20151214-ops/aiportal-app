#!/usr/bin/env node
// News-specific, fail-closed MANUAL release verification.
// It neither schedules publication nor invokes the evergreen publisher.
// Run as part of tests on the release PR, again on production main.
import fs from "node:fs";
import path from "node:path";
import {createHash} from "node:crypto";
import {parse} from "yaml";

const read=(root,p)=>fs.readFileSync(path.join(root,p),"utf8");
const sha=(str)=>{const b=Buffer.from(str.replace(/\r\n/g,"\n"),"utf8");return createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex")};
const must=(ok,message)=>{if(!ok)throw Error("News release blocked: "+message)};
const jstDate=/^\d{4}-\d{2}-\d{2}$/;
const slugPattern=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export function validateNewsRelease(root=process.cwd(),now=new Date()){
  const ledger=parse(read(root,"content/news/news-publication-log.yml"));
  const registry=parse(read(root,"content/registry/knowledge-nodes.yml"));
  must(ledger?.schemaVersion===1 && Array.isArray(ledger.releases),"invalid news-specific ledger");
  must(Array.isArray(registry?.nodes) && registry.nodeCount===registry.nodes.length,"invalid Registry");
  const ids=new Set(),slugs=new Set(),byDate=new Map();
  for(const row of ledger.releases){
    must(/^NEWS-\d{4}$/.test(row.id) && slugPattern.test(row.slug),"invalid ID or slug");
    must(!ids.has(row.id)&&!slugs.has(row.slug),"duplicate news release");
    ids.add(row.id);slugs.add(row.slug);
    must(jstDate.test(row.publishOn),"invalid news date");
    must(row.releaseSlotJst?.startsWith(row.publishOn+"T") && row.releaseSlotJst.endsWith("+09:00"),"release slot must be Asia/Tokyo and same date");
    const slot=Date.parse(row.releaseSlotJst);
    must(Number.isFinite(slot) && now.getTime()>=slot,"news release slot has not been reached");
    const count=(byDate.get(row.publishOn)||0)+1;byDate.set(row.publishOn,count);
    must(count<=1,"more than one news release per Japan date");
    must(row.approvedBy==="site-owner" && row.decision==="published" && row.approvedOn<=row.publishOn,"missing explicit owner news approval");
    must(typeof row.evidence==="string" && row.evidence.length>=50,"missing news approval evidence");
    must(/^https:\/\/openai\.com\/ja-JP\/index\/introducing-the-rosalind-academic-plan\/$/.test(row.primarySource),"missing verified official source");
    const node=registry.nodes.find(n=>n.id===row.id);
    must(node && node.slug===row.slug && node.status==="published" && node.type==="news","registry missing published news");
    const article=read(root,"content/articles/"+row.slug+".md");
    must(article.includes('id: "'+row.id+'"') && article.includes('status: "published"'),"not an approved published news article");
    must(article.includes('publishedAt: "'+row.publishOn+'"') && article.includes('updatedAt: "'+row.publishOn+'"'),"publication day mismatch");
    must(article.includes(row.primarySource),"original source missing from article");
    must(article.includes("米国の大学研究室") && article.includes("別途利用承認"),"critical audience/approval limitations missing");
    must(article.includes("](/articles/ai-hallucination)"),"approved CTA missing");
    const before=article.replace('status: "published"','status: "ready"');
    must(sha(before)===row.sourceReadyBlob,"approved ready manuscript changed other than publication status");
    const hero=path.join(root,"public","images","news",row.slug+".webp");
    must(fs.existsSync(hero),"approved news hero not generated");
    const actualHero=createHash("sha256").update(fs.readFileSync(hero)).digest("hex");
    must(actualHero===row.heroSha256,"news hero changed");
  }
  return {checked:ledger.releases.length,status:"valid"};
}
if(process.argv[1] && /validate-news-release\.mjs$/.test(process.argv[1])){
  try{const result=validateNewsRelease();console.log("News release verification:",result)}
  catch(error){console.error(error.message);process.exitCode=1}
}
