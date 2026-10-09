import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const articleFile = path.join(process.cwd(), "content/articles/self-attention.md");
const figureDir = path.join(process.cwd(), "public/images/articles/self-attention");
const figures = [
  "hero.svg",
  "fig-01-many-positions.svg",
  "fig-02-qkv.svg",
  "fig-03-value.svg",
  "fig-04-context-vector.svg",
  "fig-05-self-cross.svg",
  "fig-06-causal.svg",
];

test("Self-Attention記事はreviewで、合格済みAttentionはreadyのまま", () => {
  const articles = readAllArticles(path.join(process.cwd(), "content/articles"));
  const self = articles.find((article) => article.id === "BAS-0019");
  const attention = articles.find((article) => article.id === "BAS-0018");
  assert.ok(self);
  assert.ok(attention);
  assert.equal(self.status, "review");
  assert.equal(attention.status, "ready");
  assert.equal(self.slug, "self-attention");
  assert.equal(self.level, 2);
  assert.equal(self.type, "mechanism");

  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const byId = new Map(registry.nodes.map((node: { id: string }) => [node.id, node]));
  assert.equal((byId.get("BAS-0019") as { status: string }).status, "review");
  assert.equal((byId.get("BAS-0018") as { status: string }).status, "ready");
  assert.equal((byId.get("BAS-0017") as { status: string }).status, "review");
});

test("Self-Attentionは難所の役割と制約を分けて説明し、図解が全て存在する", () => {
  const source = readFileSync(articleFile, "utf8");
  const body = source.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length >= 5000, "scope too short");
  for (const phrase of [
    "青い帽子", "Query", "Key", "Value", "重み", "Token ID",
    "Self-Attention", "Cross-Attention", "Causal Mask",
    "未来の位置", "位置", "同じ系列", "学習済み", "RNN"
  ]) assert.ok(body.includes(phrase), "missing concept: " + phrase);
  for (const link of [
    "/articles/what-is-attention",
    "/articles/what-is-token",
    "/articles/what-is-embedding"
  ]) assert.ok(body.includes(link), "missing educational link: " + link);
  for (const heading of [...body.matchAll(/^## (.*)$/gm)].map(m => m[1])) {
    assert.ok(heading.length <= 18, "long heading: " + heading);
  }
  assert.doesNotMatch(body, /^## 次に読む$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  for (const name of figures) {
    const svgPath = path.join(figureDir, name);
    assert.ok(existsSync(svgPath), "missing asset: " + name);
    const svg = readFileSync(svgPath, "utf8");
    assert.ok(svg.length > 1000, "empty asset: " + name);
    assert.match(svg, /<svg/);
    assert.match(svg, /<title id="t">/);
    assert.ok(body.includes("/images/articles/self-attention/" + name), "unreferenced asset: " + name);
  }
});
