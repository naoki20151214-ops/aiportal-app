import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles, readArticles } from "../src/lib/article-content";

const ID="GEN-0074", SLUG="image-to-video";
const READY_SHA="36da383b9429272dd9330fa9ee9efb3fcc2f644f";
const AUDIT_SHA="7dbcea0a13bb4239bed9913d368d1d1c9f725921";
const FIGURES:Record<string,string>={
  "hero.svg":"671227c7ffe621e675e2cfa5e6d00437b134d253",
  "fig-01-two-inputs.svg":"cabe0c192613d56c3af3e4cdd90993f9d729a580",
  "fig-02-unseen.svg":"d4a9772f496afc5ef46b902981021453d537e7e4",
  "fig-03-three-motions.svg":"81432e17cbf3f71863122b763ffc5756cde3e064",
  "fig-04-first-last.svg":"29e86de175ade5a94ba8a03cbe6a71ba59c9fa08"
};
const blob=(b:Buffer)=>createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");

test("GEN-0074 original manuscript is ready and its prerequisite is scheduled",()=>{
 const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const node=registry.nodes.find((n:{id:string})=>n.id===ID);
 assert.ok(node);
 assert.equal(node.slug,SLUG);
 assert.equal(node.type,"concept");
 assert.equal(node.level,1);
 assert.deepEqual(node.prerequisites,["GEN-0017"]);
 assert.ok(["ready","published"].includes(node.status));
 const parent=registry.nodes.find((n:{id:string})=>n.id==="GEN-0017");
 assert.ok(parent);
 assert.ok(["ready","published"].includes(parent.status));
 const article=readAllArticles("content/articles").find(a=>a.id===ID);
 assert.ok(article);
 assert.equal(article.status,node.status);
 const ledger=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
 const row=ledger.approvals.find((x:{id:string})=>x.id===ID);
 assert.ok(row);
 assert.equal(row.publishOn,"2026-10-25");
 assert.equal(row.decision,node.status==="published"?"published":"approved-for-publication");
 if(node.status==="published"){
  // Delayed scheduled delivery must use the actual JST publication date.
  assert.match(row.publishedOn,/^\d{4}-\d{2}-\d{2}$/);
  assert.ok(row.publishedOn>=row.publishOn,"Published before the approved date");
  assert.equal(article.publishedAt,row.publishedOn);
  assert.equal(article.updatedAt,row.publishedOn);
 }else{
  assert.equal(row.publishedOn,undefined);
  assert.equal(article.publishedAt,row.publishOn);
 }
 
 const src=readFileSync("content/articles/image-to-video.md");
 if(node.status==="ready")assert.equal(blob(src),READY_SHA);
 const audit=readFileSync("content/editorial-audits/GEN-0074.yml");
 assert.equal(blob(audit),AUDIT_SHA);
 const report=parse(audit.toString("utf8"));
 assert.equal(report.readyArticleBlob,READY_SHA);
 assert.equal(report.criticalClaims.length,7);
 assert.ok(report.qualityScore.achieved>=80);
 assert.ok(Object.values(report.checks as Record<string,{passed:boolean}>).every(x=>x.passed));
});

test("A lighthouse photograph story explains invisible rear details, motion and reality boundary",()=>{
 const text=readFileSync("content/articles/image-to-video.md","utf8");
 const body=text.replace(/^---[\s\S]*?---\s*/,"");
 assert.ok(body.length>8200,"Core educational story unexpectedly shortened");
 for(const word of ["灯台","アオイ","裏側","丸い窓","写真","雲","波","固定",
   "カメラ","Image-to-Video","Text-to-Video","参照画像","開始フレーム","終了フレーム",
   "SynthID","実際","架空"]){
   assert.ok(body.includes(word),"Missing "+word);
 }
 assert.match(body,/^## 今日の結論$/m);
 assert.match(body,/^## 分からなければ戻ろう$/m);
 assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
});

test("Seven research sources are cited and internal links target published nodes",()=>{
 const src=readFileSync("content/articles/image-to-video.md","utf8");
 for(const url of [
  "https://academy.runwayml.com/guides/prompting-guide",
  "https://runway.com/resources/image-to-video-guide",
  "https://runway.com/resources/photo-to-video-tips",
  "https://dev.runwayml.com/endpoints/image_to_video",
  "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-first-and-last-frames",
  "https://deepmind.google/models/veo/",
  "https://arxiv.org/abs/2311.15127"
 ]) assert.ok(src.includes(url),"Source not cited "+url);
 const reg=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const live=new Set<string>(reg.nodes.filter((n:{status:string})=>n.status==="published").map((n:{slug:string})=>n.slug));
 const links=[...src.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(x=>x[1]);
 assert.ok(links.length>=3);
 for(const slug of links)assert.ok(live.has(slug),"Unpublished link "+slug);
 assert.ok(!links.includes("text-to-video"));
 assert.ok(!links.includes("video-generation-ai"));
});

test("Five original 1200 by 675 graphics are SHA-locked and accessible",()=>{
 const text=readFileSync("content/articles/image-to-video.md","utf8");
 const images=[...text.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/image-to-video\/[^)]+)\)/g)];
 assert.equal(images.length,5);
 assert.equal(new Set(images.map(x=>x[2])).size,5);
 assert.ok(images.every(i=>i[1].length>20));
 for(const [name,expected] of Object.entries(FIGURES)){
  const file=path.join("public/images/articles/image-to-video",name);
  assert.ok(existsSync(file));
  assert.ok(images.some(i=>i[2]==="/images/articles/image-to-video/"+name));
  const bytes=readFileSync(file);
  assert.equal(blob(bytes),expected,"Image changed "+name);
  const svg=bytes.toString("utf8");
  assert.match(svg,/viewBox="0 0 1200 675"/);
  assert.match(svg,/role="img"/);
  assert.match(svg,/<title id="t">/);
  assert.match(svg,/<desc id="d">/);
  assert.match(svg,/<\/svg>\s*$/);
 }
});

test("The not-yet-published article is not surfaced in public article feed",()=>{
 const all=readAllArticles("content/articles").find(x=>x.id===ID);
 assert.ok(all);
 assert.equal(readArticles("content/articles").some(x=>x.id===ID),all.status==="published");
});
