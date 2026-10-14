import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const ID = "GEN-0011";
const SLUG = "rag-retrieval";
const FILE = "content/articles/rag-retrieval.md";
const REVIEW_SHA = "9eb4bd0c0a586aa0b68cc0a2ef96c50b487fa47c";
const READY_SHA = "e9925518bacb829f70adef09fc3ea7ad9ba1c24c";
const FIGURES: Record<string,string> = {
  "hero.svg": "2e71fe34b8bfedad83cdc0fee521514c9e6d17fa",
  "fig-01-roles.svg": "85d0f35f578d71e12a52fcbe92c38abf08d31c57",
  "fig-02-hybrid.svg": "bcefd2216580b118fcd049932396c3c1ca38e39e",
  "fig-03-topk.svg": "ffed38fb0e2643115555930996a88b775a5f583d",
  "fig-04-filters.svg": "b64769ed1343eafcc10518a40338c3d81aa67789",
  "fig-05-evaluate.svg": "cdcf6c8b17d7335010ef0cdb15ee8b6ffe820b70"
};
function gitBlob(buffer:Buffer){
  return createHash("sha1").update("blob "+buffer.length+"\0").update(buffer).digest("hex");
}

test("Retrievalの監査・承認・前提記事・公開状態を整合させる",()=>{
  const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const ledger=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
  const node=registry.nodes.find((v:{id:string})=>v.id===ID);
  assert.ok(node);
  assert.equal(node.slug,SLUG);
  assert.equal(node.level,2);
  assert.equal(node.type,"mechanism");
  assert.ok(["ready","published"].includes(node.status));
  assert.deepEqual(node.prerequisites,["GEN-0008","GEN-0010"]);
  for(const key of [...node.prerequisites,"GEN-0009","BAS-0015"])
    assert.equal(registry.nodes.find((v:{id:string})=>v.id===key)?.status,"published");
  const article=readAllArticles("content/articles").find(v=>v.id===ID);
  assert.ok(article);
  assert.equal(article.slug,SLUG);
  assert.equal(article.status,node.status);
  const approval=ledger.approvals.find((v:{id:string})=>v.id===ID);
  assert.ok(approval);
  assert.equal(approval.approvedBy,"editorial-qa");
  assert.equal(approval.delegation,"site-owner-standing-policy-2026-10-13");
  assert.equal(approval.sourceArticleBlob,READY_SHA);
  assert.equal(approval.originalReviewArticleBlob,REVIEW_SHA);
  assert.equal(approval.editorialAuditPath,"content/editorial-audits/"+ID+".yml");
  const auditText=readFileSync(approval.editorialAuditPath);
  assert.equal(gitBlob(auditText),approval.editorialAuditBlob);
  assert.equal(parse(auditText.toString("utf8")).readyArticleBlob,READY_SHA);
  assert.equal(approval.decision,node.status==="published"?"published":"approved-for-publication");
});

test("初心者に必須の考え方と架空の旧版／改訂版を説明",()=>{
  const article=readFileSync(FILE,"utf8");
  const body=article.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(body.length>=9000);
  for(const word of ["町内会","午前9時","午前10時","架空","Retrieval","Chunking","Embedding","Vector Database","Hybrid Search","RRF","Top-k","Pre-filter","Post-filter","閲覧権限","Reranking","Recall","Precision","Groundedness","正しい版","LLM"]){
    assert.ok(body.includes(word),"Missing beginner explanation "+word);
  }
  assert.match(body,/^## 今日の結論$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|SOC|INF)-\d{4}\b/);
});

test("一次資料と公開済み記事へのリンクのみを引用",()=>{
  const article=readFileSync(FILE,"utf8");
  const URLs=[
  "https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-retrieve.html",
  "https://docs.aws.amazon.com/bedrock/latest/userguide/kb-how-it-works.html",
  "https://learn.microsoft.com/en-us/azure/search/hybrid-search-overview",
  "https://learn.microsoft.com/en-us/azure/search/hybrid-search-ranking",
  "https://docs.aws.amazon.com/bedrock/latest/userguide/kb-test-config.html",
  "https://learn.microsoft.com/en-us/azure/search/vector-search-filters",
  "https://learn.microsoft.com/en-us/azure/search/semantic-search-overview",
  "https://learn.microsoft.com/en-us/azure/foundry/concepts/evaluation-evaluators/rag-evaluators"
];
  for(const url of URLs)assert.ok(article.includes(url),"Missing verified official source "+url);
  const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const published=new Set<string>(registry.nodes.filter((v:{status:string})=>v.status==="published").map((v:{slug:string})=>v.slug));
  const links=[...article.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(m=>m[1]);
  assert.ok(links.length>=6);
  for(const slug of links)assert.ok(published.has(slug),"Unpublished link "+slug);
  for(const slug of ["what-is-rag","vector-database","rag-chunking","what-is-embedding"])
    assert.ok(links.includes(slug));
  assert.ok(!links.includes("rag-reranking"));
});

test("6枚の図解のGit Blob SHAとalt・SVGアクセシビリティを照合",()=>{
  const content=readFileSync(FILE,"utf8");
  const refs=[...content.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/retrieval\/[^)]+)\)/g)];
  assert.equal(refs.length,6);
  assert.equal(new Set(refs.map(r=>r[2])).size,6);
  for(const ref of refs)assert.ok(ref[1].length>12);
  for(const [name,sha] of Object.entries(FIGURES)){
    const url="/images/articles/retrieval/"+name;
    const file=path.join(process.cwd(),"public",url);
    assert.ok(existsSync(file));
    assert.ok(refs.some(r=>r[2]===url));
    const data=readFileSync(file);
    assert.equal(gitBlob(data),sha,"Artwork differs from original "+name);
    const svg=data.toString("utf8");
    assert.match(svg,/viewBox="0 0 1200 675"/);
    assert.match(svg,/<title id="t">/);
    assert.match(svg,/<desc id="d">/);
    assert.match(svg,/<\/svg>\s*$/);
  }
});
