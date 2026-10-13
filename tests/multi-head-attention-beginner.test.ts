import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const ARTICLE = "content/articles/multi-head-attention.md";
const EXPECTED: Record<string, string> = {
  "hero.svg": "5381c142bd316018e8b10ac61b0f9c04b20fdc37",
  "fig-01-heads.svg": "bab4428045df2952111c549edd283494f9e1d3a3",
  "fig-02-projections.svg": "711296232c46b386389c85f44274e0f94d24fc98",
  "fig-03-merge.svg": "aa23a3622d5ed14f0b7ae87c48cdeba81cb83d6c",
};
function shaOfGitBlob(buffer: Buffer): string {
  return createHash("sha1")
    .update("blob " + buffer.length + "\0")
    .update(buffer)
    .digest("hex");
}
test("Multi-Headは独立監査付きでready、または自動公開済み", () => {
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const ledger = parse(readFileSync("content/registry/article-approval-log.yml", "utf8"));
  const node = registry.nodes.find((n: { id: string }) => n.id === "BAS-0020");
  assert.ok(node);
  assert.equal(node.slug, "multi-head-attention");
  assert.ok(["ready", "published"].includes(node.status));
  assert.deepEqual(node.prerequisites, ["BAS-0019", "BAS-0101"]);
  for(const dep of node.prerequisites) {
    assert.equal(registry.nodes.find((n: { id: string }) => n.id === dep)?.status, "published");
  }
  const articles = readAllArticles("content/articles");
  const article = articles.find(a => a.id === "BAS-0020");
  assert.ok(article);
  assert.equal(article.status, node.status);
  assert.equal(article.level, 2);
  const approval = ledger.approvals.find((x: { id: string }) => x.id === "BAS-0020");
  assert.ok(approval);
  assert.equal(approval.approvedBy, "editorial-qa");
  assert.equal(approval.delegation, "site-owner-standing-policy-2026-10-13");
  assert.equal(approval.editorialAuditBlob, "d01658952e77555d73bb9f7052d22aa46e551154");
  assert.equal(approval.originalReviewArticleBlob, "83841b8ddf00bf06ff58feb0c09222cac38cd331");
  assert.equal(approval.decision, node.status === "published" ? "published" : "approved-for-publication");
});

test("同じ帽子の例でMulti-Headを説明し、元の4図解のGit Blobを一切変更しない", () => {
  const source = readFileSync(ARTICLE, "utf8");
  const body = source.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length >= 3500 && body.length <= 6000);
  assert.match(body.slice(0, 550), /赤くて小さな帽子/);
  for(const fragment of ["一つのAttentionでも", "学習済み", "Head", "異なる",
    "固定されるわけではありません", "未来", "重み", "Query・Key・Value", "結合"]) {
    assert.ok(body.includes(fragment), "Missing central explanation: " + fragment);
  }
  assert.match(body, /^## ここで迷ったら$/m);
  assert.match(body, /^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);

  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml","utf8"));
  const published = new Set(registry.nodes.filter((n: {status:string})=>n.status==="published")
    .map((n: {slug:string})=>n.slug));
  const referenced = [...body.matchAll(/\]\(\/articles\/([a-z0-9-]+)\)/g)].map(m=>m[1]);
  for(const target of referenced) {
    assert.ok(published.has(target),"Unpublished internal link: "+target);
  }
  for(const expectedLink of ["self-attention","what-is-attention","what-is-embedding","query-key-value"]) {
    assert.ok(referenced.includes(expectedLink),"Missing conceptual prerequisite: "+expectedLink);
  }
  for(const url of [
    "https://arxiv.org/abs/1706.03762",
    "https://nlp.seas.harvard.edu/annotated-transformer/",
    "https://docs.pytorch.org/docs/stable/generated/torch.nn.MultiheadAttention.html",
  ]) {
    assert.ok(body.includes(url),"Missing existing primary citation: "+url);
  }
  for(const [filename,originalSha] of Object.entries(EXPECTED)) {
    const relative = "/images/articles/multi-head-attention/" + filename;
    assert.ok(body.includes(relative),"Missing original figure reference: "+relative);
    const local = path.join("public",relative);
    assert.ok(existsSync(local),"Missing original figure file: "+relative);
    const b=readFileSync(local);
    assert.equal(shaOfGitBlob(b),originalSha,"Image must be the unchanged source Git blob: "+filename);
    assert.match(b.toString("utf8"), /<title id="t">/);
    assert.match(b.toString("utf8"), /<desc id="d">/);
  }
});
