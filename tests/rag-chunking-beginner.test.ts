import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";
import path from "node:path";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const ID = "GEN-0009";
const SLUG = "rag-chunking";
const EXPECTED_IMAGES: Record<string,string> = {
  "hero.svg": "221a03c5c9351cfc72d985bcd1274b67de3cb924",
  "fig-01-large-vs-small.svg": "023bed958513a2de970495a28604146192e915ac",
  "fig-02-broken-context.svg": "8939a72398a35be972c14d2acc4c81b14e1de1ac",
  "fig-03-overlap.svg": "15d4c827faf319c29f3ca52681e002583626ec6c",
  "fig-04-strategies.svg": "855d90b9f82fe7f97b7c060af3178a57613cfa5f",
  "fig-05-diagnostic.svg": "43f92abe024681b325fe1f0aed9d7aad9c7d084b",
};
const blobSha=(buffer:Buffer):string=>createHash("sha1").update("blob "+buffer.length+"\0").update(buffer).digest("hex");
const articlePath="content/articles/rag-chunking.md";

test("Chunking記事は確かな前提知識とSHA監査を持つready/公開済み記事",()=>{
  const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const ledger=parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
  const node=registry.nodes.find((item:{id:string})=>item.id===ID);
  assert.ok(node);
  assert.equal(node.slug,SLUG);
  assert.equal(node.level,2);
  assert.equal(node.type,"mechanism");
  assert.ok(["ready","published"].includes(node.status));
  assert.deepEqual(node.prerequisites,["GEN-0008"]);
  assert.equal(registry.nodes.find((item:{id:string})=>item.id==="GEN-0008")?.status,"published");
  const article=readAllArticles("content/articles").find(a=>a.id===ID);
  assert.ok(article);
  assert.equal(article.slug,SLUG);
  assert.equal(article.status,node.status);
  const approval=ledger.approvals.find((item:{id:string})=>item.id===ID);
  assert.ok(approval);
  assert.equal(approval.approvedBy,"editorial-qa");
  assert.equal(approval.delegation,"site-owner-standing-policy-2026-10-13");
  assert.equal(approval.sourceArticleBlob,"73ff74027dfb23fab9bd2322998eaa1fc2fc3837");
  assert.equal(approval.originalReviewArticleBlob,"502cabf0e63a3b361e4bf804f0aec5e9fb9e4cc0");
  assert.equal(approval.editorialAuditBlob,"d45423b5d8c19a1c11270955891d87fe6486d256");
  assert.equal(approval.decision,node.status==="published"?"published":"approved-for-publication");
});

test("小分けにする理由と切りすぎ・大きすぎの両方の落とし穴を一つの例で説明",()=>{
  const all=readFileSync(articlePath,"utf8");
  const body=all.replace(/^---[\s\S]*?---\s*/,"");
  assert.ok(body.length>=6900,"Not a complete textbook-quality manuscript");
  for(const part of [
    "町内会","午前9時","午前10時","架空の例",
    "Chunking","チャンク","小さければ小さいほどいい",
    "大きすぎても困る","Overlap","Semantic Chunking",
    "Hierarchical Chunking","見出し","文脈",
    "512 Token","25％","Token数と文字数は同じではありません",
    "すべてのRAGでチャンク化が必須というわけではありません",
    "閲覧権限","出典","改訂版"
  ]) assert.ok(body.includes(part),"Missing an essential teaching caveat: "+part);
  assert.match(body,/^## 今日の結論$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body,/\b(?:GEN|BAS|AGT|PHY|INF|SOC)-\d{4}\b/);
});

test("参考一次資料と関連記事リンクはすべて実在し、未公開記事にリンクしない",()=>{
  const all=readFileSync(articlePath,"utf8");
  for(const source of [
    "https://learn.microsoft.com/en-us/azure/search/vector-search-how-to-chunk-documents",
    "https://docs.aws.amazon.com/ja_jp/bedrock/latest/userguide/kb-chunking.html",
    "https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent_ChunkingConfiguration.html",
    "https://learn.microsoft.com/en-us/azure/search/vector-store"
  ]) assert.ok(all.includes(source),"Missing checked official source "+source);
  const registry=parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const published=new Set<string>(registry.nodes.filter((x:{status:string})=>x.status==="published")
    .map((x:{slug:string})=>x.slug));
  const targets=[...all.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(m=>m[1]);
  assert.ok(targets.length>=6);
  for(const target of targets)assert.ok(published.has(target),"Unpublished internal link "+target);
  assert.ok(targets.includes("what-is-rag"));
  assert.ok(!targets.includes("vector-database"));
});

test("6枚の元図は順序・SVGタイトル・内容・Git blobが不変",()=>{
  const source=readFileSync(articlePath,"utf8");
  const refs=[...source.matchAll(/!\[([^\]]*)\]\((\/images\/articles\/chunking\/[^)]+)\)/g)];
  assert.equal(refs.length,6);
  assert.equal(refs[0][2],"/images/articles/chunking/hero.svg");
  assert.ok(refs.every(ref=>ref[1].length>=12),"Missing descriptive Japanese alt text");
  for(const [filename,original] of Object.entries(EXPECTED_IMAGES)){
    const url="/images/articles/chunking/"+filename;
    const file=path.join(process.cwd(),"public",url);
    assert.ok(existsSync(file),"Missing SVG "+filename);
    assert.ok(refs.some(ref=>ref[2]===url),"Illustration not referenced "+url);
    const bytes=readFileSync(file);
    assert.equal(blobSha(bytes),original,"Original illustration modified "+filename);
    const svg=bytes.toString("utf8");
    assert.match(svg,/viewBox="0 0 1200 675"/);
    assert.match(svg,/<title id="t">/);
    assert.match(svg,/<desc id="d">/);
    assert.match(svg,/<\/svg>\s*$/);
  }
});
