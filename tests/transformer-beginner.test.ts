import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const root = process.cwd();
const articlePath = path.join(root, "content/articles/what-is-transformer.md");

test("Transformer改訂原稿はreviewのまま、前提の未合格記事を公開しない", () => {
  const articles = readAllArticles(path.join(root, "content/articles"));
  const article = articles.find((a) => a.id === "BAS-0017");
  const registry = parse(readFileSync(path.join(root, "content/registry/knowledge-nodes.yml"), "utf8"));
  const node = registry.nodes.find((n: { id: string }) => n.id === "BAS-0017");
  assert.ok(article);
  assert.ok(node);
  assert.equal(article.status, "review");
  assert.equal(node.status, "review");
  assert.equal(article.slug, "what-is-transformer");
  assert.equal(article.level, 1);
  assert.equal(articles.find((a) => a.id === "GEN-0004")?.status, "ready");
});

test("同じ赤い帽子の例でTokenから文脈まで初心者向けに説明する", () => {
  const article = readFileSync(articlePath, "utf8");
  const body = article.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length >= 4200 && body.length <= 6200, "Unexpected article length: " + body.length);
  for (const term of ["赤い帽子", "紙袋", "それ", "かぶって", "Token", "ベクトル", "Embedding", "RNN", "Attention", "位置", "並列", "LLM", "2017年"]) {
    assert.ok(body.includes(term), "Missing key concept: " + term);
  }
  for (const destination of ["/articles/what-is-token", "/articles/what-is-embedding", "/articles/vectors-for-ai", "/articles/what-is-language-model", "/articles/what-is-attention"]) {
    assert.ok(body.includes(destination), "Missing learning link: " + destination);
  }
  assert.match(body, /^## ここで迷ったら$/m);
  assert.match(body, /^## 今回のまとめ$/m);
  assert.match(body, /^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(body, /^## 最後に一本でつなぐ$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  const h2s = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  for (const heading of h2s) assert.ok(heading.length <= 18, "Long H2: " + heading);
});

test("画像は承認前に本文に組み込まず、仮サムネイルを使う", () => {
  const article = readFileSync(articlePath, "utf8");
  assert.match(article, /^thumbnail: "\/images\/article-placeholder\.svg"$/m);
  assert.ok(existsSync(path.join(root, "public/images/article-placeholder.svg")));
  assert.doesNotMatch(article, /\/images\/articles\/transformer\//);
});
