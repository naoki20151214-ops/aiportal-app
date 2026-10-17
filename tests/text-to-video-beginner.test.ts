import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles, readArticles } from "../src/lib/article-content";

const ID="GEN-0073", SLUG="text-to-video";
const REVIEW_SHA="77ca6f31262f80015a6c72bc531bb7b2e1dfbb7e";
const READY_SHA="cf5732db0e9050966de2033e7c87917427b4f4f4";
const AUDIT_SHA="b80e06b6eba38f2865ecca50cb52a7d0df98c360";
const FIGURES:Record<string,string>={
  "hero.svg":"ebcffccbdd0841dd119bc3ee89fdb92170a4496d",
  "fig-01-five-parts.svg":"43abafd1026142ce557c44c8832003185901cb12",
  "fig-02-camera.svg":"81ac8f5af6a5e76bbca9db08ee29d41d2eb2865c",
  "fig-03-storyboard.svg":"a42d7d9e5ded71657f8c8abe6828876db9e0f2f3",
  "fig-04-review.svg":"f759aa08b77869ddb0b73dfa238485e3e50c2efd"
};
const blob=(buffer:Buffer)=>createHash("sha1").update("blob "+buffer.length+"\0").update(buffer).digest("hex");

test("GEN-0073 is approved for Oct 24 JST after its Oct 16 prerequisite, never premature",()=>{
  const reg=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const ledger=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
  assert.ok(reg.nodeCount >= 500, "At least the original 500 knowledge nodes remain");
  assert.equal(reg.nodeCount, reg.nodes.length, "Registry count matches actual nodes");
  const node=reg.nodes.find((x:{id:string})=>x.id===ID);
  assert.ok(node);
  assert.equal(node.slug,SLUG);
  assert.equal(node.title,"Text-to-Videoとは？");
  assert.equal(node.level,1);
  assert.equal(node.type,"concept");
  assert.deepEqual(node.prerequisites,["GEN-0017"]);
  const parent=reg.nodes.find((x:{id:string})=>x.id==="GEN-0017");
  assert.ok(parent);
  assert.ok(["ready","published"].includes(parent.status));
  assert.ok(["ready","published"].includes(node.status));
  const source=readAllArticles("content/articles").find(a=>a.id===ID);
  assert.ok(source);
  assert.equal(source.status,node.status);
  assert.equal(source.publishedAt,"2026-10-24");
  const row=ledger.approvals.find((x:{id:string})=>x.id===ID);
  assert.ok(row);
  assert.equal(row.approvedBy,"editorial-qa");
  assert.equal(row.delegation,"site-owner-standing-policy-2026-10-13");
  assert.equal(row.originalReviewArticleBlob,REVIEW_SHA);
  assert.equal(row.sourceArticleBlob,READY_SHA);
  assert.equal(row.editorialAuditBlob,AUDIT_SHA);
  assert.equal(row.editorialAuditPath,"content/editorial-audits/GEN-0073.yml");
  assert.equal(row.publishOn,"2026-10-24");
  assert.equal(row.decision,node.status==="published"?"published":"approved-for-publication");
  const parentRow=ledger.approvals.find((x:{id:string})=>x.id==="GEN-0017");
  assert.ok(parentRow);
  assert.equal(parentRow.publishOn,"2026-10-16");
  assert.ok(parentRow.publishOn<row.publishOn);
  const reportBytes=readFileSync(row.editorialAuditPath);
  assert.equal(blob(reportBytes),AUDIT_SHA);
  const report=parse(reportBytes.toString("utf8"));
  assert.equal(report.readyArticleBlob,READY_SHA);
  assert.equal(report.criticalClaims.length,6);
  assert.ok(report.qualityScore.achieved>=80);
  assert.ok(Object.values(report.checks as Record<string,{passed:boolean}>).every(c=>c.passed));
});

test("Original story teaches five prompt components and single-scene inspection, not duplicated video fundamentals",()=>{
  const src=readFileSync("content/articles/text-to-video.md","utf8");
  const body=src.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(body.length>9200,"Story was unexpectedly shortened");
  for(const word of ["パン屋","クロワッサン","湯気","木のテーブル",
    "被写体","動作","場面","カメラ","雰囲気","固定カメラ","ドリーイン",
    "ワンカット","プロンプト","Subject","Static shot","Text-to-Video",
    "Image-to-Video","権利","架空","AIで制作したイメージ映像です"]){
    assert.ok(body.includes(word),"Missing key lesson "+word);
  }
  assert.match(body,/^## 今日の結論$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  assert.doesNotMatch(body,/\]\(\/articles\/video-generation-ai\)/);
});

test("Each evidence URL appears in content and all internal lessons are published",()=>{
  const src=readFileSync("content/articles/text-to-video.md","utf8");
  for(const url of [
    "https://docs.cloud.google.com/vertex-ai/generative-ai/docs/video/generate-videos-from-text?hl=ja",
    "https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/video/video-gen-prompt-guide?hl=en",
    "https://openai.com/index/video-generation-models-as-world-simulators/",
    "https://research.google/blog/coherent-long-form-video-generation/",
    "https://deepmind.google/models/veo/",
    "https://help.openai.com/en/articles/20001152-what-to-know-about-the-sora-discontinuation"
  ])assert.ok(src.includes(url),"Missing primary reference "+url);
  const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const published=new Set<string>(registry.nodes.filter((n:{status:string})=>n.status==="published").map((n:{slug:string})=>n.slug));
  const links=[...src.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(m=>m[1]);
  assert.ok(links.length>=3);
  for(const slug of links)assert.ok(published.has(slug),"Cannot link to queued lesson "+slug);
  assert.ok(!links.includes("video-generation-ai"));
  assert.ok(!links.includes("image-to-video"));
});

test("Original five SVG diagrams are present with pinned Git blobs and Japanese alt",()=>{
  const src=readFileSync("content/articles/text-to-video.md","utf8");
  const figures=[...src.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/text-to-video\/[^)]+)\)/g)];
  assert.equal(figures.length,5);
  assert.equal(new Set(figures.map(f=>f[2])).size,5);
  assert.ok(figures.every(f=>f[1].length>20));
  for(const [filename,sha] of Object.entries(FIGURES)){
    const file=path.join(process.cwd(),"public/images/articles/text-to-video",filename);
    assert.ok(existsSync(file),"Missing original "+file);
    assert.ok(figures.some(f=>f[2]==="/images/articles/text-to-video/"+filename),"Unused asset "+filename);
    const bytes=readFileSync(file);
    assert.equal(blob(bytes),sha,"Original diagram changed "+filename);
    const svg=bytes.toString("utf8");
    assert.match(svg,/viewBox="0 0 1200 675"/);
    assert.match(svg,/role="img"/);
    assert.match(svg,/<title id="t">/);
    assert.match(svg,/<desc id="d">/);
    assert.match(svg,/<\/svg>\s*$/);
  }
});

test("Until scheduler promotes it, ready GEN-0073 is not visible in live article listing",()=>{
  const all=readAllArticles("content/articles").find(a=>a.id===ID);
  assert.ok(all);
  assert.equal(readArticles("content/articles").some(a=>a.id===ID),all.status==="published");
});
