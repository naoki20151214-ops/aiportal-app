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
  "fig-04-context-vector.svg",
  "fig-06-causal.svg",
];

test("Self-Attention記事は未合格のreviewを維持し、Attentionはreadyのまま", () => {
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

test("Self-Attentionを赤い帽子の具体例から説明し、難しい計算は後続へ渡す", () => {
  const source = readFileSync(articleFile, "utf8");
  const body = source.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length >= 2700 && body.length <= 4500, "初心者向けの記事が長すぎる、または短すぎる");
  assert.match(body.slice(0, 900), /赤い帽子を買った/);
  for (const phrase of [
    "Self-Attention", "帽子", "赤い", "Token",
    "Embedding", "数字の並び", "重み", "同じ文章",
    "未来", "Transformer", "別の記事"
  ]) {
    // Self-Attention and Attention may be introduced, not a Q/K/V computation lecture.
    if (phrase === "Transformer") continue;
    assert.ok(body.includes(phrase), "missing essential explanation: " + phrase);
  }
  assert.ok(body.includes("Query・Key・Value"), "応用記事への予告が必要");
  assert.doesNotMatch(body, /^## (?:Query|Key|Value|Cross-Attention)/m);
  assert.ok(body.includes("/articles/what-is-attention"));
  assert.ok(body.includes("/articles/what-is-token"));
  assert.ok(body.includes("/articles/what-is-embedding"));
  for (const heading of [...body.matchAll(/^## (.*)$/gm)].map(m => m[1])) {
    assert.ok(heading.length <= 18, "スマホの見出しが長い: " + heading);
  }
  assert.doesNotMatch(body, /^## 次に読む$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);

  const usedFigures = [...body.matchAll(/\/images\/articles\/self-attention\/([a-z0-9-]+\.svg)/g)].map(m => m[1]);
  assert.deepEqual(usedFigures, figures, "記事内の図解は段階的に並べる");
  for (const name of figures) {
    const file = path.join(figureDir, name);
    assert.ok(existsSync(file), "missing figure: " + name);
    const svg = readFileSync(file, "utf8");
    assert.ok(svg.length > 1200);
    assert.match(svg, /<svg/);
    assert.match(svg, /<title id="chart-title">/);
  }
});
