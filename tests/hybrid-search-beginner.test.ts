import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const ID = "GEN-0013";
const SLUG = "hybrid-search";
const READY_SHA = "dc62e823ebd24bfdfb69a4b7dcb153af31a315b2";
const REVIEW_SHA = "dee26aeddebf387912e7e13ef61954d0084080c0";
const AUDIT_SHA = "f4de25d5ba761c077dfab34b5d10aad54f971b98";
const FIGURES: Record<string, string> = {
  "hero.svg": "c55762e3273dcc62035b68c686452f8ae06d2235",
  "fig-01-two-paths.svg": "ac3189c36d469f845453579dc5f99692caa1ba4a",
  "fig-02-rrf.svg": "1a129368c51d262965fcdd3b18c87084fee695e3",
  "fig-03-pipeline.svg": "610d6bf368554c1c8a401a0c5bfff21ca79e4d88",
  "fig-04-validity.svg": "57eac6e45dcae613a8244f7f4ee24a71214de879",
};
const gitBlob=(data: Buffer) => createHash("sha1")
  .update("blob " + data.length + "\0").update(data).digest("hex");

test("GEN-0013 is approved for scheduled publication and bound to an exact ready manuscript",()=>{
  const reg=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const ledger=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
  const node=reg.nodes.find((n:{id:string})=>n.id===ID);
  assert.ok(node);
  assert.equal(node.slug,SLUG);
  assert.equal(node.level,3);
  assert.equal(node.type,"mechanism");
  assert.deepEqual(node.prerequisites,["GEN-0011"]);
  assert.ok(["ready","published"].includes(node.status));
  for (const id of ["GEN-0011","GEN-0012","GEN-0010","GEN-0008","GEN-0009"])
    assert.equal(reg.nodes.find((n:{id:string})=>n.id===id)?.status,"published");
  const article=readAllArticles("content/articles").find((x)=>x.id===ID);
  assert.ok(article);
  assert.equal(article.slug,SLUG);
  assert.equal(article.status,node.status);
  const approval=ledger.approvals.find((x:{id:string})=>x.id===ID);
  assert.ok(approval);
  assert.equal(approval.decision,node.status==="published"?"published":"approved-for-publication");
  assert.equal(approval.approvedBy,"editorial-qa");
  assert.equal(approval.delegation,"site-owner-standing-policy-2026-10-13");
  assert.equal(approval.originalReviewArticleBlob,REVIEW_SHA);
  assert.equal(approval.sourceArticleBlob,READY_SHA);
  assert.equal(approval.editorialAuditBlob,AUDIT_SHA);
  assert.equal(approval.editorialAuditPath,"content/editorial-audits/GEN-0013.yml");
  assert.equal(approval.publishOn,"2026-10-15");
  const audit=readFileSync(approval.editorialAuditPath);
  assert.equal(gitBlob(audit),AUDIT_SHA);
  const report=parse(audit.toString("utf8"));
  assert.equal(report.readyArticleBlob,READY_SHA);
  assert.ok(report.qualityScore.achieved>=80);
  assert.ok(Object.values(report.checks as Record<string,{passed:boolean}>).every(x=>x.passed===true));
});

test("RRF, combined searching and limitations are explained as a textbook narrative",()=>{
  const content=readFileSync("content/articles/hybrid-search.md","utf8");
  const body=content.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(body.length>8200,"Explanatory story must not become a shallow glossary");
  for(const word of ["町内会","午前9時","午前10時","A-204","Hybrid Search",
      "キーワード検索","ベクトル検索","Embedding","BM25","RRF",
      "逆数","順位","旧版","改訂版","有効=true","閲覧権限",
      "Reranking","LLM","架空","真偽"]) {
    assert.ok(body.includes(word),"Missing critical context: "+word);
  }
  assert.match(body,/^## 今日の結論$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
});

test("Primary sources and all article links have published destinations",()=>{
  const article=readFileSync("content/articles/hybrid-search.md","utf8");
  for(const url of [
    "https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview",
    "https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking",
    "https://learn.microsoft.com/en-us/azure/search/hybrid-search-how-to-query",
    "https://learn.microsoft.com/en-us/azure/search/vector-search-filters",
    "https://learn.microsoft.com/en-us/azure/search/vector-search-overview",
    "https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html",
    "https://docs.aws.amazon.com/bedrock/latest/userguide/kb-how-retrieval.html",
  ])assert.ok(article.includes(url),"Official source absent: "+url);
  const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const published=new Set<string>(registry.nodes.filter((x:{status:string})=>x.status==="published")
    .map((x:{slug:string})=>x.slug));
  const links=[...article.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(x=>x[1]);
  assert.ok(links.length>=8);
  for(const target of links)assert.ok(published.has(target),"Unpublished internal link "+target);
  for(const slug of ["rag-retrieval","rag-reranking","what-is-rag","what-is-embedding","vector-database"])
    assert.ok(links.includes(slug));
});

test("All five original SVGs remain SHA-pinned and have descriptive Japanese alternatives",()=>{
  const article=readFileSync("content/articles/hybrid-search.md","utf8");
  const refs=[...article.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/hybrid-search\/[^)]+)\)/g)];
  assert.equal(refs.length,5);
  assert.equal(new Set(refs.map(x=>x[2])).size,5);
  assert.equal(refs[0][2],"/images/articles/hybrid-search/hero.svg");
  for(const ref of refs)assert.ok(ref[1].length>18);
  for(const [name,expected] of Object.entries(FIGURES)){
    const url="/images/articles/hybrid-search/"+name;
    const filename=path.join(process.cwd(),"public",url);
    assert.ok(existsSync(filename),"Missing image "+name);
    assert.ok(refs.some(x=>x[2]===url),"Unused image "+name);
    const data=readFileSync(filename);
    assert.equal(gitBlob(data),expected);
    const svg=data.toString("utf8");
    assert.match(svg,/viewBox="0 0 1200 675"/);
    assert.match(svg,/<title id="t">/);
    assert.match(svg,/<desc id="d">/);
    assert.match(svg,/<\/svg>\s*$/);
  }
});

test("scheduled article is not listed by the published-only static site before 20:00 release",()=>{
  const doc=readAllArticles("content/articles").find(a=>a.id===ID);
  assert.ok(doc);
  const metadata=readAllArticles("content/articles").filter(a=>a.status==="published");
  if(doc.status==="ready")assert.ok(!metadata.some(a=>a.id===ID));
  else assert.ok(metadata.some(a=>a.id===ID));
});
