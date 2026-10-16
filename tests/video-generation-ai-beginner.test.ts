import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles, readArticles } from "../src/lib/article-content";

const ID="GEN-0017";
const SLUG="video-generation-ai";
const REVIEW_SHA="c707102eaac6f6b283d3f5341f2a38f031dc25fc";
const READY_SHA="2ccc59305da589c25277ccae3110a5638bb09ef7";
const AUDIT_SHA="8c654398a4ec47a65f5938e5f48f1440dce551b7";
const FIGURES: Record<string,string>={
 "hero.svg":"2ccfdeea5f0dc82a601443211b94341f704da2c3",
 "fig-01-frames.svg":"4d8c916f948f7ba2f8b5dc36f0f2292d30e5d97d",
 "fig-02-diffusion.svg":"0a11d2193365162ef7e3e8a55d4357e78da52ae7",
 "fig-03-consistency.svg":"3af6a8f061d637a5f59c49f98bf65dd8d20d6460",
 "fig-04-safety.svg":"0368e5d222692ef5177ef813746b50f0c52fce82"
};
const blob=(bytes:Buffer)=>createHash("sha1").update("blob "+bytes.length+"\0").update(bytes).digest("hex");

test("GEN-0017 preserves approved provenance and distinguishes scheduled from actual publication date",()=>{
 const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const ledger=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
 const node=registry.nodes.find((x:{id:string})=>x.id===ID);
 assert.ok(node);
 assert.equal(node.slug,SLUG);
 assert.equal(node.level,1);
 assert.equal(node.type,"concept");
 assert.deepEqual(node.prerequisites,["GEN-0001","BAS-0030"]);
 for(const id of node.prerequisites)assert.equal(registry.nodes.find((x:{id:string})=>x.id===id)?.status,"published");
 assert.equal(registry.nodes.some((x:{id:string})=>x.id==="GEN-0015"),false);
 assert.ok(["ready","published"].includes(node.status));
 const doc=readAllArticles("content/articles").find(x=>x.id===ID);
 assert.ok(doc);
 assert.equal(doc.status,node.status);
 const row=ledger.approvals.find((x:{id:string})=>x.id===ID);
 assert.ok(row);
 assert.equal(row.approvedBy,"editorial-qa");
 assert.equal(row.delegation,"site-owner-standing-policy-2026-10-13");
 assert.equal(row.originalReviewArticleBlob,REVIEW_SHA);
 assert.equal(row.sourceArticleBlob,READY_SHA);
 assert.equal(row.editorialAuditPath,"content/editorial-audits/GEN-0017.yml");
 assert.equal(row.editorialAuditBlob,AUDIT_SHA);
 assert.equal(row.publishOn,"2026-10-16");
 assert.equal(row.decision,node.status==="published"?"published":"approved-for-publication");
  if(node.status==="published"){
    assert.match(row.publishedOn,/^\d{4}-\d{2}-\d{2}$/);
    assert.ok(row.publishedOn>=row.publishOn,"Actual publication must not predate its scheduled JST day");
    assert.equal(doc.publishedAt,row.publishedOn);
  }else{
    assert.equal(doc.publishedAt,row.publishOn,"Queued article keeps its planned date until publication");
  }
 const audit=readFileSync(row.editorialAuditPath);
 assert.equal(blob(audit),AUDIT_SHA);
 const report=parse(audit.toString("utf8"));
 assert.equal(report.readyArticleBlob,READY_SHA);
 assert.ok(report.qualityScore.achieved>=80);
 assert.equal(report.criticalClaims.length,8);
 assert.ok(Object.values(report.checks as Record<string,{passed:boolean}>).every(x=>x.passed));
});

test("Beginner story teaches time coherence, frame sequencing, methods and AI video provenance",()=>{
 const src=readFileSync("content/articles/video-generation-ai.md","utf8");
 const body=src.replace(/^---[\s\S]*?---\s*/,"");
 assert.ok(body.length>8400,"Full textbook-style story unexpectedly shortened");
 for(const term of ["町内会","公園清掃","ほうき","午前9時","午前10時","フレーム","Image-to-Video",
 "Text-to-Video","時間的一貫性","拡散モデル","ノイズ","Sora","Veo",
 "肖像","著作権","SynthID","AIで作成したイメージ映像","架空"])assert.ok(body.includes(term),"Missing "+term);
 assert.match(body,/2026年4月26日/);
 assert.match(body,/2026年9月24日/);
 assert.match(body,/^## 今日の結論$/m);
 assert.match(body,/^## 分からなければ戻ろう$/m);
 assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
});

test("Official URLs are included and all internal links target already published articles",()=>{
 const src=readFileSync("content/articles/video-generation-ai.md","utf8");
 for(const url of [
 "https://help.openai.com/ja-jp/articles/20001152-what-to-know-about-the-sora-discontinuation",
 "https://openai.com/index/sora/",
 "https://openai.com/index/video-generation-models-as-world-simulators/",
 "https://research.google/blog/google-research-2022-beyond-language-vision-and-generative-models/",
 "https://deepmind.google/models/veo/",
 "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-first-and-last-frames",
 "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-text?hl=ja",
 "https://research.google/blog/coherent-long-form-video-generation/"
 ])assert.ok(src.includes(url),"Missing source "+url);
 const reg=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const published=new Set<string>(reg.nodes.filter((x:{status:string})=>x.status==="published").map((x:{slug:string})=>x.slug));
 const links=[...src.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(x=>x[1]);
 assert.ok(links.length>=5);
 for(const link of links)assert.ok(published.has(link),"Unpublished link "+link);
 assert.ok(!links.includes("image-generation-ai"));
 assert.ok(!links.includes("audio-generation-ai"));
});

test("Original video conceptual illustrations have exact Git SHAs, alt and accessible SVG descriptions",()=>{
 const src=readFileSync("content/articles/video-generation-ai.md","utf8");
 const refs=[...src.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/video-generation-ai\/[^)]+)\)/g)];
 assert.equal(refs.length,5);
 assert.equal(new Set(refs.map(x=>x[2])).size,5);
 assert.equal(refs[0][2],"/images/articles/video-generation-ai/hero.svg");
 for(const x of refs)assert.ok(x[1].length>18);
 for(const [file,expected] of Object.entries(FIGURES)){
  const url="/images/articles/video-generation-ai/"+file,abs=path.join(process.cwd(),"public",url);
  assert.ok(existsSync(abs),"No SVG "+url);
  assert.ok(refs.some(x=>x[2]===url),"Unused SVG "+url);
  const contents=readFileSync(abs);
  assert.equal(blob(contents),expected,"Modified original illustration "+file);
  const svg=contents.toString("utf8");
  assert.match(svg,/viewBox="0 0 1200 675"/);
  assert.match(svg,/<title id="t">/);
  assert.match(svg,/<desc id="d">/);
  assert.match(svg,/<\/svg>\s*$/);
 }
});

test("Ready video article never leaks into public list until the scheduled publisher runs",()=>{
 const source=readAllArticles("content/articles").find(x=>x.id===ID);
 assert.ok(source);
 assert.equal(readArticles("content/articles").some(x=>x.id===ID),source.status==="published");
});
