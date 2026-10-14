import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const ID = "GEN-0010";
const SLUG = "vector-database";
const FILE = "content/articles/vector-database.md";
const FIGURES: Record<string, string> = {
  "hero.svg": "53e2ac8832bf2595c56b7cd08044fcc291fd0529",
  "fig-01-records.svg": "99750c9837f7099b1c6a7edf8b4b45e68f8db30b",
  "fig-02-meaning-map.svg": "687cc767b188f08c8fbb3ea22fde3ecab0011eac",
  "fig-03-two-paths.svg": "4cb751f0223b07e7e9fbad57dce2827ce7fb9967",
  "fig-04-exact-ann.svg": "deb977df5277a6ebb938de49bffd575b94ddf556",
  "fig-05-metadata.svg": "c1fbee1c80210919b8a1de2da7d3b955b6f89422",
};
function gitBlob(data: Buffer): string {
  return createHash("sha1").update("blob "+data.length+"\0").update(data).digest("hex");
}

test("Vector Databaseの公開前提・監査SHA・原稿statusは整合している",()=>{
  const reg = parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const ledger = parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
  const node = reg.nodes.find((n:{id:string})=>n.id===ID);
  assert.ok(node);
  assert.equal(node.slug,SLUG);
  assert.equal(node.level,2);
  assert.equal(node.type,"concept");
  assert.ok(["ready","published"].includes(node.status));
  assert.deepEqual(node.prerequisites,["BAS-0015","BAS-0016","GEN-0008"]);
  for(const id of node.prerequisites)
    assert.equal(reg.nodes.find((n:{id:string})=>n.id===id)?.status,"published");
  assert.equal(reg.nodes.find((n:{id:string})=>n.id==="GEN-0009")?.status,"published");
  const doc=readAllArticles("content/articles").find(a=>a.id===ID);
  assert.ok(doc);
  assert.equal(doc.slug,SLUG);
  assert.equal(doc.status,node.status);
  assert.equal(doc.level,2);
  const approval=ledger.approvals.find((entry:{id:string})=>entry.id===ID);
  assert.ok(approval);
  assert.equal(approval.approvedBy,"editorial-qa");
  assert.equal(approval.delegation,"site-owner-standing-policy-2026-10-13");
  assert.equal(approval.sourceArticleBlob,"bc93a0363c3c7f7b21771ecce4841a5b15b5aa4b");
  assert.equal(approval.originalReviewArticleBlob,"74f57568d1350806d0d099c14e070565e40a07d6");
  assert.equal(approval.editorialAuditBlob,"b5b5aac663c003ff96d0ba6ab732588c2ed3ef18");
  assert.equal(approval.decision,node.status==="published"?"published":"approved-for-publication");
});

test("ベクトル検索の役割・架空の新版/旧版・近似検索の取りこぼしを明示",()=>{
  const article=readFileSync(FILE,"utf8");
  const body=article.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(body.length>7500,"Reader deserves a complete narrative explanation");
  for(const term of [
    "町内会","午前9時","午前10時","架空の例",
    "Chunking","Embeddingモデル","同じEmbeddingモデル",
    "資料の版","ベクトル","近い","正しい",
    "Vector Databaseそのものが新しい答えを文章で作るわけではない",
    "ANN","Exact","最も近い候補を見逃す可能性",
    "HNSW","ユークリッド距離","Cosine Similarity",
    "Hybrid Search","閲覧権限","元の文章","pgvector",
    "新しいお知らせを入れたら自動で反映される？"
  ]) assert.ok(body.includes(term),"Missing critical didactic caveat: "+term);
  assert.ok(body.indexOf("午前9時")<body.indexOf("午前10時"));
  assert.match(body,/^## 今日の結論$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body,/\b(?:BAS|GEN|AGT|PHY|SOC|INF)-\d{4}\b/);
});

test("公式一次資料と公開済みの復習リンクだけを使う",()=>{
  const article=readFileSync(FILE,"utf8");
  for(const url of [
    "https://learn.microsoft.com/en-us/azure/search/vector-search-overview",
    "https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-query",
    "https://learn.microsoft.com/en-us/azure/search/vector-search-ranking",
    "https://learn.microsoft.com/en-us/azure/search/vector-search-filters",
    "https://docs.aws.amazon.com/bedrock/latest/userguide/kb-how-it-works.html",
    "https://github.com/pgvector/pgvector"
  ]) assert.ok(article.includes(url),"Missing original authoritative source "+url);
  const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const allowed=new Set<string>(registry.nodes.filter((n:{status:string})=>n.status==="published")
    .map((n:{slug:string})=>n.slug));
  const links=[...article.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(m=>m[1]);
  assert.ok(links.length>=5);
  for(const slug of links) assert.ok(allowed.has(slug),"Unpublished internal link: "+slug);
  assert.ok(links.includes("what-is-rag")&&links.includes("rag-chunking")&&links.includes("what-is-embedding")&&links.includes("vectors-for-ai"));
  assert.ok(!links.includes("rag-retrieval"));
});

test("６枚のSVGと元制作時のGit blobが一致し日本語altがある",()=>{
  const article=readFileSync(FILE,"utf8");
  const refs=[...article.matchAll(/!\[([^\]]+)\]\((\/images\/articles\/vector-database\/[^)]+)\)/g)];
  assert.equal(refs.length,6);
  assert.equal(new Set(refs.map(r=>r[2])).size,6);
  assert.equal(refs[0][2],"/images/articles/vector-database/hero.svg");
  for(const ref of refs)assert.ok(ref[1].length>14,"Missing meaningful alt description");
  for(const [name,expected] of Object.entries(FIGURES)){
    const url="/images/articles/vector-database/"+name;
    const full=path.join(process.cwd(),"public",url);
    assert.ok(existsSync(full),"Missing figure "+name);
    assert.ok(refs.some(r=>r[2]===url),"Unused image "+name);
    const bytes=readFileSync(full);
    assert.equal(gitBlob(bytes),expected,"Modified original diagram "+name);
    const svg=bytes.toString("utf8");
    assert.match(svg,/viewBox="0 0 1200 675"/);
    assert.match(svg,/<title id="t">/);
    assert.match(svg,/<desc id="d">/);
    assert.match(svg,/<\/svg>\s*$/);
  }
});
