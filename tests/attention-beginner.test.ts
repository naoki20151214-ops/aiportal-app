import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const slug = "what-is-attention";
const assetDir = path.join(process.cwd(), "public/images/articles/attention");
const visuals = [
  "hero.svg",
  "fig-01-context.svg",
  "fig-02-distance.svg",
  "fig-03-flow.svg",
  "fig-04-mix.svg",
  "fig-05-mask.svg",
];

test("Attention記事は合格済みreadyで、Registryと一致する", () => {
  const articles = readAllArticles(path.join(process.cwd(), "content/articles"));
  const article = articles.find((item) => item.slug === slug);
  assert.ok(article);
  assert.equal(article.id, "BAS-0018");
  assert.equal(article.status, "ready");
  assert.equal(article.level, 2);
  assert.equal(article.type, "mechanism");

  const registry = parse(readFileSync(path.join(process.cwd(), "content/registry/knowledge-nodes.yml"), "utf8"));
  const node = registry.nodes.find((item: { id: string }) => item.id === "BAS-0018");
  assert.ok(node);
  assert.equal(node.status, "ready");
  assert.equal(node.slug, slug);
  assert.deepEqual(node.nextReading.map((item: { id: string }) => item.id), ["BAS-0019", "BAS-0017"]);
});

test("Attention記事は文脈→重み→情報の統合を具体例で説明する", () => {
  const src = readFileSync(path.join(process.cwd(), "content/articles/what-is-attention.md"), "utf8");
  const body = src.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length >= 4_500, "説明の段階が不足しています");
  for (const phrase of [
    "青い帽子", "赤い靴", "履いて", "かぶって", "Attention",
    "Token", "Embedding", "重み", "数値情報", "ベクトル",
    "Token ID", "Causal Mask", "Self-Attention", "Query", "Key", "Value",
  ]) assert.ok(body.includes(phrase), "missing topic: " + phrase);

  for (const url of ["/articles/what-is-token", "/articles/what-is-embedding", "/articles/what-is-transformer"]) {
    assert.ok(body.includes(url));
  }
  const headings = [...body.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  for (const heading of headings) assert.ok(heading.length <= 18, "mobile heading too long: " + heading);
  assert.doesNotMatch(body, /^## 次に読む$/m, "Next reading must be generated from Registry");
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);

  for (const filename of visuals) {
    const file = path.join(assetDir, filename);
    assert.ok(existsSync(file), "missing figure: " + filename);
    const svg = readFileSync(file, "utf8");
    assert.ok(svg.length > 1_000, "figure unexpectedly empty: " + filename);
    assert.match(svg, /<svg[\s\S]*<title/);
    assert.ok(body.includes("/images/articles/attention/" + filename), "unreferenced figure: " + filename);
  }
});
