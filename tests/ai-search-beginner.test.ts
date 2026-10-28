import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles, readArticles } from "../src/lib/article-content";

const ID="GEN-0022";
const SLUG="ai-search";
const REVIEW_SHA="c1a9462b96318ee66bed58e35ce2e65d8a18fe4e";
const READY_SHA="a8c0af526a90067bbc5a12d23fdd8b0c040fb970";
const AUDIT_SHA="fb43cf5d7a51f4e7bf5e292b406205d152afd1f2";
const FIGURES:Record<string,string>={
  "hero.svg":"efea6af7b7856a726cd48f7643fe81d20dc3ad43",
  "fig-01-compare.svg":"80afae9bd1473223ac83b32932d6bbd7df98531b",
  "fig-02-flow.svg":"85b817671ce03ccb3935758124b5216386b0f62c",
  "fig-03-fanout.svg":"ec934c83f6a1a261865b1200f7106b35cdf2b526",
  "fig-04-verify.svg":"6f936e58b2a5553b3f8dc0542d92443ff50d51d6"
};
const blob=(buffer:Buffer)=>createHash("sha1").update("blob "+buffer.length+"\0").update(buffer).digest("hex");

test("GEN-0022 is only scheduled after GEN-0002 with an immutable approved audit",()=>{
  const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const ledger=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
  assert.ok(registry.nodeCount >= 500, "At least the original 500 knowledge nodes remain");
  assert.equal(registry.nodeCount, registry.nodes.length, "Registry count matches actual nodes");
  const node=registry.nodes.find((x:{id:string})=>x.id===ID);
  assert.ok(node);
  assert.equal(node.slug,SLUG);
  assert.equal(node.title,"AI検索とは？");
  assert.equal(node.level,1);
  assert.equal(node.type,"concept");
  assert.deepEqual(node.prerequisites,["GEN-0002"]);
  assert.equal(registry.nodes.find((x:{id:string})=>x.id==="GEN-0002")?.status,"published");
  assert.ok(["ready","published"].includes(node.status));
  const article=readAllArticles("content/articles").find(x=>x.id===ID);
  assert.ok(article);
  assert.equal(article.status,node.status);
  
  const row=ledger.approvals.find((x:{id:string})=>x.id===ID);
  assert.ok(row);
  assert.equal(row.approvedBy,"editorial-qa");
  assert.equal(row.delegation,"site-owner-standing-policy-2026-10-13");
  assert.equal(row.originalReviewArticleBlob,REVIEW_SHA);
  assert.equal(row.sourceArticleBlob,READY_SHA);
  assert.equal(row.editorialAuditPath,"content/editorial-audits/GEN-0022.yml");
  assert.equal(row.editorialAuditBlob,AUDIT_SHA);
  assert.equal(row.publishOn,"2026-10-22");
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
  const audit=readFileSync(row.editorialAuditPath);
  assert.equal(blob(audit),AUDIT_SHA);
  const report=parse(audit.toString("utf8"));
  assert.equal(report.readyArticleBlob,READY_SHA);
  assert.ok(report.qualityScore.achieved>=80);
  assert.equal(report.criticalClaims.length,6);
  assert.ok(Object.values(report.checks as Record<string,{passed:boolean}>).every(x=>x.passed));
});

test("AI search story clearly distinguishes answers, links, RAG, fan-out and source verification",()=>{
  const src=readFileSync("content/articles/ai-search.md","utf8");
  const body=src.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(body.length>8500,"Story unexpectedly shortened");
  for(const term of ["星空観察会","ユイ","午後6時30分","午後7時","2階ホール",
    "検索エンジン","AI検索","AI Overviews","AIモード","ChatGPT",
    "クエリ ファンアウト","Hybrid Search","RAG","出典","一次資料","未確認","架空"]){
    assert.ok(body.includes(term),"Missing concept "+term);
  }
  assert.match(body,/^## 今日の結論$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
});

test("First-party and peer-reviewed-source URLs are included; internal links are published-only",()=>{
  const src=readFileSync("content/articles/ai-search.md","utf8");
  for(const url of [
    "https://blog.google/intl/ja-jp/products/explore-get-answers/ai-mode-search/",
    "https://blog.google/products-and-platforms/products/search/ai-overviews-update-may-2024/",
    "https://support.google.com/websearch/answer/16011537?co=GENIE.Platform%3DDesktop&hl=en",
    "https://openai.com/ja-JP/index/introducing-chatgpt-search/",
    "https://help.openai.com/ja-jp/articles/9237897-searching-the-web-with-chatgpt",
    "https://arxiv.org/abs/2005.11401"
  ])assert.ok(src.includes(url),"Missing primary source "+url);
  const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const live=new Set<string>(registry.nodes.filter((n:{status:string})=>n.status==="published").map((n:{slug:string})=>n.slug));
  const links=[...src.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(m=>m[1]);
  assert.ok(links.length>=6);
  for(const link of links)assert.ok(live.has(link),"Unpublished internal link: "+link);
  for(const future of ["what-is-chatgpt","what-is-claude","what-is-gemini"])
    assert.ok(!links.includes(future),"No future scheduled article links");
});

test("Five original accessible diagrams have immutable Git blob hashes",()=>{
  const article=readFileSync("content/articles/ai-search.md","utf8");
  const refs=[...article.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/ai-search\/[^)]+)\)/g)];
  assert.equal(refs.length,5);
  assert.equal(new Set(refs.map(x=>x[2])).size,5);
  assert.ok(refs.every(x=>x[1].length>20));
  for(const [name,sha] of Object.entries(FIGURES)){
    const file=path.join("public/images/articles/ai-search",name);
    assert.ok(existsSync(file),"Missing "+file);
    assert.ok(refs.some(x=>x[2]==="/images/articles/ai-search/"+name),"Unused "+name);
    const b=readFileSync(file);
    assert.equal(blob(b),sha,"Changed original artwork "+name);
    const svg=b.toString("utf8");
    assert.match(svg,/viewBox="0 0 1200 675"/);
    assert.match(svg,/<title id="t">/);
    assert.match(svg,/<desc id="d">/);
    assert.match(svg,/role="img"/);
    assert.match(svg,/<\/svg>\s*$/);
  }
});

test("Ready AI search article stays hidden until the timed release",()=>{
  const source=readAllArticles("content/articles").find(x=>x.id===ID);
  assert.ok(source);
  assert.equal(readArticles("content/articles").some(x=>x.id===ID),source.status==="published");
});
