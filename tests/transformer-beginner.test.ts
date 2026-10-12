import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";

const figures = [
  "hero.webp", "fig-01-relations.webp", "fig-02-compare.webp",
  "fig-03-attention.webp", "fig-04-position.webp",
  "fig-05-parallel.webp", "fig-06-flow.webp",
];
const articlePath = path.join(process.cwd(), "content/articles/what-is-transformer.md");

test("BAS-0017 is ready and keeps approved red-hat example", () => {
  const article = readFileSync(articlePath, "utf8");
  const text = article.replace(/^---[\s\S]*?---\s*/, "");
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const transformer = registry.nodes.find((n: { id: string }) => n.id === "BAS-0017");
  assert.equal(transformer?.status, "ready");
  assert.match(article, /^id: "BAS-0017"$/m);
  assert.match(article, /^status: "ready"$/m);
  assert.match(article, /^thumbnail: "\/images\/articles\/transformer\/hero.webp"$/m);
  assert.ok(text.length >= 4100 && text.length <= 6500, `Unexpected body length: ${text.length}`);
  for (const phrase of [
    "赤い帽子", "それ", "トークンID", "ベクトル", "RNN",
    "Attention", "位置", "並列", "Transformer", "LLM",
    "学習", "文脈", "順番", "2017年",
  ]) assert.ok(text.includes(phrase), "Missing educational keyword: " + phrase);
  assert.match(text, /^## ここで迷ったら$/m);
  assert.match(text, /^## 今回のまとめ$/m);
  assert.match(text, /^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(text, /^## 最後に一本でつなぐ$/m);
  assert.doesNotMatch(text, /\b(?:BAS|GEN)-\d{4}\b/);
  assert.doesNotMatch(text, /Query\s*[:=]|Key\s*[:=]|Value\s*[:=]/);
  for (const url of [
    "/articles/what-is-token", "/articles/vectors-for-ai",
    "/articles/what-is-embedding", "/articles/what-is-attention",
    "/articles/ai-hallucination",
  ]) assert.ok(text.includes(url), "Missing learning link: " + url);
  for (const heading of [...text.matchAll(/^## (.+)$/gm)].map(m => m[1])) {
    assert.ok(heading.length <= 18, `Too long for mobile: ${heading}`);
  }
});

test("Seven approved illustrations are referenced in order and are real WebP files", () => {
  const article = readFileSync(articlePath, "utf8");
  const inlineImageRefs = [...article.matchAll(/!\[[^\]]+\]\(\/images\/articles\/transformer\/([a-z0-9-]+\.webp)\)/g)]
    .map(m => m[1]);
  assert.deepEqual(inlineImageRefs, figures);
  for (const filename of figures) {
    const p = path.join(process.cwd(), "public/images/articles/transformer", filename);
    assert.ok(existsSync(p), "Missing illustration: " + filename);
    const img = readFileSync(p);
    assert.ok(img.byteLength > 25000, `Image too small: ${filename}`);
    assert.equal(img.toString("ascii", 0, 4), "RIFF");
    assert.equal(img.toString("ascii", 8, 12), "WEBP");
  }
});