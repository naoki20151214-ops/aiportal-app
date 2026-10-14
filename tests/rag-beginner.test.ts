import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const ID = "GEN-0008";
const SLUG = "what-is-rag";
const EXPECTED_FIGURES: Record<string, string> = {
  "hero.svg": "4d17f6c885ced23e83263709f0dd702415c0e92b",
  "fig-01-closed-vs-rag.svg": "0ac3a8c3754f0251002160413c2ddc11013ed70c",
  "fig-02-prepare-documents.svg": "bd674c451e57e633eba22c55f7e4b889493e8c51",
  "fig-03-retrieve-augment-generate.svg": "2e753d302f0891e1b8b0fec40cbdf2f447339ae3",
  "fig-04-old-new.svg": "715193b31d3d7e5b5052b51e39206a9825e8549b",
  "fig-05-qa.svg": "a1b773fff8b030de021eb2a04cdfae4e144e637e",
};
function blobSha(buffer: Buffer): string {
  return createHash("sha1").update("blob " + buffer.length + "\0").update(buffer).digest("hex");
}

test("RAG記事は認可済みの監査と前提依存を持ち、ready/公開済みのどちらでも整合する", () => {
  const reg = parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const ledger = parse(readFileSync("content/registry/article-approval-log.yml","utf8"));
  const node = reg.nodes.find((n: {id:string}) => n.id === ID);
  assert.ok(node);
  assert.equal(node.slug, SLUG);
  assert.equal(node.level, 1);
  assert.equal(node.type, "concept");
  assert.ok(["ready", "published"].includes(node.status));
  assert.deepEqual(node.prerequisites, ["GEN-0002", "BAS-0015"]);
  for (const dep of node.prerequisites) {
    assert.equal(reg.nodes.find((n: {id:string}) => n.id === dep)?.status, "published");
  }
  const article = readAllArticles("content/articles").find(a=>a.id===ID);
  assert.ok(article);
  assert.equal(article.status, node.status);
  assert.equal(article.level, 1);
  assert.equal(article.type, "concept");
  const approval = ledger.approvals.find((a: {id:string})=>a.id===ID);
  assert.ok(approval);
  assert.equal(approval.slug, SLUG);
  assert.equal(approval.approvedBy, "editorial-qa");
  assert.equal(approval.delegation, "site-owner-standing-policy-2026-10-13");
  assert.equal(approval.originalReviewArticleBlob, "571f62a6128a6668ea6ba08eff190e94b00c73fc");
  assert.equal(approval.sourceArticleBlob, "74f3e413fdc1c62c8987b9a8991382cba5339adf");
  assert.equal(approval.editorialAuditBlob, "b336c572d2add32d8acfa64bdfe83b04ed08a814");
  assert.equal(approval.decision, node.status === "published" ? "published" : "approved-for-publication");
});

test("RAGは創作の9時から10時へ変わる具体例で検索と生成の違いを解説する", () => {
  const article = readFileSync("content/articles/what-is-rag.md","utf8");
  const body = article.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length>=6000, "RAG article should be a substantial illustrated explanation");
  for (const text of [
    "町内会","午前9時","午前10時","架空の例",
    "Retrieve","Augment","Generate","Chunk","Embedding",
    "キーワード検索","ベクトル検索","ハイブリッド検索",
    "学習を一切しない","アクセス権限","正当な指示",
    "ハルシネーションはゼロ","出典","再学習"
  ]) assert.ok(body.includes(text), "Missing RAG explanatory safeguard: "+text);
  assert.ok(body.indexOf("午前9時") < body.indexOf("午前10時"));
  assert.match(body,/^## 今日の結論$/m);
  assert.match(body,/^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body,/\b(?:GEN|BAS|AGT|SOC|PHY|INF)-\d{4}\b/);
});

test("RAG記事の元資料参照は一次資料5本、内部リンクは公開済みのみ", () => {
  const body = readFileSync("content/articles/what-is-rag.md","utf8");
  for (const source of [
    "https://arxiv.org/abs/2005.11401",
    "https://learn.microsoft.com/en-ca/azure/foundry/concepts/retrieval-augmented-generation?view=foundry-classic",
    "https://learn.microsoft.com/en-us/azure/search/retrieval-augmented-generation-overview?tabs=docs",
    "https://docs.aws.amazon.com/bedrock/latest/userguide/kb-how-it-works.html",
    "https://docs.aws.amazon.com/bedrock/latest/userguide/knowledge-base.html",
  ]) assert.ok(body.includes(source), "Missing original reference "+source);
  const reg = parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const published = new Set(reg.nodes.filter((n:{status:string})=>n.status==="published")
    .map((n:{slug:string})=>n.slug));
  const linkTargets = [...body.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(m=>m[1]);
  assert.ok(linkTargets.length>=7);
  for (const slug of linkTargets) assert.ok(published.has(slug), "Unpublished link "+slug);
  assert.ok(!linkTargets.includes("rag-chunking"));
});

test("RAGの6図は本文で引用され、すべて元の新規制作Git Blobと一致する", () => {
  const article = readFileSync("content/articles/what-is-rag.md","utf8");
  const refs = [...article.matchAll(/!\[([^\]]*)\]\((\/images\/articles\/rag\/[^)]+)\)/g)];
  assert.equal(refs.length,6);
  assert.ok(refs.every(x=>x[1].length>=12),"Each figure must carry meaningful Japanese alt text");
  for(const [name,expected] of Object.entries(EXPECTED_FIGURES)) {
    const url="/images/articles/rag/"+name;
    const local=path.join("public",url);
    assert.ok(existsSync(local),"Missing illustration "+name);
    assert.ok(refs.some(x=>x[2]===url),"Figure not cited "+name);
    const svg=readFileSync(local);
    assert.equal(blobSha(svg),expected,"Figure changed unexpectedly: "+name);
    const markup=svg.toString("utf8");
    assert.match(markup,/viewBox="0 0 1200 675"/);
    assert.match(markup,/<svg/);
    assert.match(markup,/<title id="t">/);
    assert.match(markup,/<desc id="d">/);
    assert.match(markup,/<\/svg>\s*$/);
  }
});
