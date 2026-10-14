import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const ID = "GEN-0012";
const SLUG = "rag-reranking";
const FILE = "content/articles/rag-reranking.md";
const REVIEW_SHA = "4d4eb81f6dcf02dbc1f599bc01aa935f026b1665";
const READY_SHA = "3bde016666a8566d65dc424b99d49124c4c2682e";
const AUDIT_SHA = "655ac75ab10dc473de9c4e3e48cc2a4ff492747c";
const FIGURES: Record<string,string> = {
 "hero.svg":"deaed50fc391fade5fc66a6efbe65bdd347c48a6",
 "fig-01-two-stage.svg":"2d48b7026079bdc2777d24f01ef75c4f040e7cdd",
 "fig-02-question-match.svg":"27a78c36cf236e10d7f2e5fb2fc1876d8152857f",
 "fig-05-evaluation.svg":"edbe94bcc3a39c401d7baff1577c5e7f2d1740e9"
};
const sha=(data:Buffer)=>createHash("sha1").update("blob "+data.length+"\0").update(data).digest("hex");

test("Rerankingの前提、承認原稿SHA、監査SHA、公開状態が整合する",()=>{
 const reg=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const ledger=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
 const node=reg.nodes.find((n:{id:string})=>n.id===ID);
 assert.ok(node);
 assert.equal(node.slug,SLUG);
 assert.equal(node.type,"mechanism");
 assert.equal(node.level,3);
 assert.ok(["ready","published"].includes(node.status));
 assert.deepEqual(node.prerequisites,["GEN-0011"]);
 for(const id of ["GEN-0011","GEN-0010","GEN-0008","GEN-0009"]) {
   assert.equal(reg.nodes.find((n:{id:string})=>n.id===id)?.status,"published");
 }
 const doc=readAllArticles("content/articles").find(a=>a.id===ID);
 assert.ok(doc);
 assert.equal(doc.slug,SLUG);
 assert.equal(doc.status,node.status);
 const approval=ledger.approvals.find((n:{id:string})=>n.id===ID);
 assert.ok(approval);
 assert.equal(approval.approvedBy,"editorial-qa");
 assert.equal(approval.delegation,"site-owner-standing-policy-2026-10-13");
 assert.equal(approval.originalReviewArticleBlob,REVIEW_SHA);
 assert.equal(approval.sourceArticleBlob,READY_SHA);
 assert.equal(approval.editorialAuditPath,"content/editorial-audits/GEN-0012.yml");
 assert.equal(approval.editorialAuditBlob,AUDIT_SHA);
 const auditBuf=readFileSync(approval.editorialAuditPath);
 assert.equal(sha(auditBuf),AUDIT_SHA);
 const audit=parse(auditBuf.toString("utf8"));
 assert.equal(audit.readyArticleBlob,READY_SHA);
 assert.ok(audit.qualityScore.achieved>=80);
 assert.ok(Object.values(audit.checks).every((v:{passed?:boolean})=>v.passed===true));
 assert.equal(approval.decision,node.status==="published"?"published":"approved-for-publication");
});

test("意味が近い・真偽・候補漏れを明確に分ける読み物",()=>{
 const text=readFileSync(FILE,"utf8"),body=text.replace(/^---[\s\S]*?---\s*/,"");
 assert.ok(body.length>7800,"Complete story-driven explanation required");
 for(const keyword of ["町内会","午前9時","午前10時","Reranking","Retriever","Reranker","LLM",
 "Embedding","Vector Database","Semantic Ranker","Cross-Encoder","BM25","RRF",
 "候補","改訂版","関連性","検索順位","閲覧権限","0〜4","架空"]){
  assert.ok(body.includes(keyword),"Missing important caveat: "+keyword);
 }
 assert.match(body,/^## 今日の結論$/m);
 assert.match(body,/^## 分からなければ戻ろう$/m);
 assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
});

test("実在する一次資料とpublished内部リンクのみを参照",()=>{
 const text=readFileSync(FILE,"utf8");
 const urls=[
  "https://learn.microsoft.com/en-us/azure/search/semantic-search-overview",
  "https://learn.microsoft.com/en-us/azure/search/semantic-how-to-query-request",
  "https://learn.microsoft.com/en-us/azure/search/vector-search-filters",
  "https://docs.aws.amazon.com/bedrock/latest/userguide/rerank.html",
  "https://docs.aws.amazon.com/bedrock/latest/userguide/rerank-use.html",
  "https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-retrieve.html"
 ];
 for(const url of urls)assert.ok(text.includes(url),"Missing cited source "+url);
 const reg=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
 const published=new Set<string>(reg.nodes.filter((n:{status:string})=>n.status==="published").map((n:{slug:string})=>n.slug));
 const links=[...text.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(x=>x[1]);
 assert.ok(links.length>=5);
 for(const link of links)assert.ok(published.has(link),"Unpublished link "+link);
 assert.ok(links.includes("rag-retrieval"));
 assert.ok(links.includes("vector-database"));
 assert.ok(!links.includes("hybrid-search"));
});

test("原図4点のSHA、alt、SVG title/descを検証。存在しない画像を参照しない",()=>{
 const text=readFileSync(FILE,"utf8");
 const refs=[...text.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/reranking\/[^)]+)\)/g)];
 assert.equal(refs.length,4);
 assert.equal(new Set(refs.map(x=>x[2])).size,4);
 assert.equal(refs[0][2],"/images/articles/reranking/hero.svg");
 for(const ref of refs)assert.ok(ref[1].length>14);
 for(const [name,expected] of Object.entries(FIGURES)){
  const url="/images/articles/reranking/"+name;
  const file=path.join(process.cwd(),"public",url);
  assert.ok(existsSync(file),"Missing "+name);
  assert.ok(refs.some(x=>x[2]===url),"Not used "+name);
  const data=readFileSync(file);
  assert.equal(sha(data),expected,"Original image blob modified: "+name);
  const svg=data.toString("utf8");
  assert.match(svg,/viewBox="0 0 1200 675"/);
  assert.match(svg,/<title id="t">/);
  assert.match(svg,/<desc id="d">/);
  assert.match(svg,/<\/svg>\s*$/);
 }
});
