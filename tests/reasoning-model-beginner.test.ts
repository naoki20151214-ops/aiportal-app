import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles, readArticles } from "../src/lib/article-content";

const ID="GEN-0040", SLUG="reasoning-model";
const REVIEW_SHA="a108f1810b1c2203f830e83d65baf12d3fa8e1d3";
const READY_SHA="d3200ae420f653250af78d8ab4fe61008a8293c1";
const AUDIT_SHA="e3b3dee67ddd1c1e25cccc7bdecd42465779ae7f";
const FIGURES:Record<string,string>={
  "hero.svg":"86a8529b3a1a209be9822a920043e2ab0d8cde32",
  "fig-01-cart.svg":"b158851453e1af7090cddbe3d12f4695c65949e5",
  "fig-02-steps.svg":"ae1632c00022dff444c1715d4d79c2034b3f7ffd",
  "fig-03-training.svg":"c26649694667f8360f79d6d3577427d892741763",
  "fig-04-tradeoffs.svg":"0acb2319d015888da33835869e7f25773f49c1d6"
};
const blob=(b:Buffer)=>createHash("sha1").update("blob "+b.length+"\0").update(b).digest("hex");

test("GEN-0040 registered and scheduled with immutable editorial proof",()=>{
  const reg=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  assert.equal(reg.nodeCount,500);
  const node=reg.nodes.find((n:{id:string})=>n.id===ID);
  assert.ok(node);
  assert.equal(node.slug,SLUG);
  assert.equal(node.title,"Reasoning Modelとは？");
  assert.equal(node.type,"concept");
  assert.equal(node.level,1);
  assert.deepEqual(node.prerequisites,["GEN-0002"]);
  assert.equal(reg.nodes.find((n:{id:string})=>n.id==="GEN-0002")?.status,"published");
  assert.ok(["ready","published"].includes(node.status));
  const art=readAllArticles("content/articles").find(x=>x.id===ID);
  assert.ok(art);
  assert.equal(art.status,node.status);
  assert.equal(art.publishedAt,"2026-10-23");
  const log=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
  const row=log.approvals.find((r:{id:string})=>r.id===ID);
  assert.ok(row);
  assert.equal(row.approvedBy,"editorial-qa");
  assert.equal(row.delegation,"site-owner-standing-policy-2026-10-13");
  assert.equal(row.originalReviewArticleBlob,REVIEW_SHA);
  assert.equal(row.sourceArticleBlob,READY_SHA);
  assert.equal(row.editorialAuditPath,"content/editorial-audits/GEN-0040.yml");
  assert.equal(row.editorialAuditBlob,AUDIT_SHA);
  assert.equal(row.publishOn,"2026-10-23");
  assert.equal(row.decision,node.status==="published"?"published":"approved-for-publication");
  const aud=readFileSync(row.editorialAuditPath);
  assert.equal(blob(aud),AUDIT_SHA);
  const report=parse(aud.toString("utf8"));
  assert.equal(report.readyArticleBlob,READY_SHA);
  assert.equal(report.criticalClaims.length,7);
  assert.ok(report.qualityScore.achieved>=80);
  assert.ok(Object.values(report.checks as Record<string,{passed:boolean}>).every(x=>x.passed));
});

test("Teaching problem covers the distinction between five loads and nine one-way movements",()=>{
  const src=readFileSync("content/articles/reasoning-model.md","utf8");
  const body=src.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(body.length>8500,"Narrative unexpectedly truncated");
  for(const word of ["37箱","8箱","5回","4回","9回","10回","片道","最後","倉庫",
    "強化学習","推論時の計算","Chain of Thought","DeepSeek-R1","Gemini 2.5",
    "o1","検算","正解","架空"])assert.ok(body.includes(word),"Missing learner step "+word);
  assert.match(body,/^## 今日の結論$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
});

test("Primary references are cited and article links point only to published lessons",()=>{
  const src=readFileSync("content/articles/reasoning-model.md","utf8");
  for(const url of [
    "https://openai.com/index/learning-to-reason-with-llms/",
    "https://openai.com/index/introducing-o3-and-o4-mini/",
    "https://blog.google/innovation-and-ai/models-and-research/google-deepmind/gemini-model-thinking-updates-march-2025/",
    "https://blog.google/innovation-and-ai/models-and-research/google-deepmind/google-gemini-updates-io-2025/",
    "https://ai.google.dev/gemini-api/docs/thinking/",
    "https://arxiv.org/abs/2501.12948"
  ])assert.ok(src.includes(url),"Missing original source "+url);
  const reg=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const published=new Set<string>(reg.nodes.filter((n:{status:string})=>n.status==="published").map((n:{slug:string})=>n.slug));
  const links=[...src.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(x=>x[1]);
  assert.ok(links.length>=4);
  for(const slug of links)assert.ok(published.has(slug),"Link to unpublished article "+slug);
});

test("Five figure paths have descriptive alt, accessible content, and source-pinned blobs",()=>{
  const src=readFileSync("content/articles/reasoning-model.md","utf8");
  const refs=[...src.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/reasoning-model\/[^)]+)\)/g)];
  assert.equal(refs.length,5);
  assert.equal(new Set(refs.map(x=>x[2])).size,5);
  assert.ok(refs.every(x=>x[1].length>20));
  for(const [name,sha] of Object.entries(FIGURES)){
    const absolute=path.join("public/images/articles/reasoning-model",name);
    assert.ok(existsSync(absolute),"Missing "+absolute);
    assert.ok(refs.some(x=>x[2]==="/images/articles/reasoning-model/"+name),"Unused "+name);
    const data=readFileSync(absolute);
    assert.equal(blob(data),sha,"Illustration changed after acceptance "+name);
    const xml=data.toString("utf8");
    assert.match(xml,/viewBox="0 0 1200 675"/);
    assert.match(xml,/role="img"/);
    assert.match(xml,/<title id="t">/);
    assert.match(xml,/<desc id="d">/);
    assert.match(xml,/<\/svg>\s*$/);
  }
});

test("Scheduled article cannot leak into public article feed before publisher",()=>{
  const all=readAllArticles("content/articles").find(a=>a.id===ID);
  assert.ok(all);
  const visible=readArticles("content/articles").some(a=>a.id===ID);
  assert.equal(visible,all.status==="published");
});
