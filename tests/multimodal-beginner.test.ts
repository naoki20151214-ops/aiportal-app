import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const figures = ["hero.svg", "fig-01-modalities.svg", "fig-02-flow.svg",
  "fig-03-architectures.svg", "fig-04-time.svg"];

test("BAS-0030 reuses completed material without releasing it", () => {
  const nodeMap = new Map(parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8")).nodes
    .map((n: { id: string; status: string; prerequisites: string[] }) => [n.id, n] as const));
  const node = nodeMap.get("BAS-0030") as {status: string; prerequisites: string[]};
  assert.ok(node);
  assert.equal(node.status, "ready");
  assert.deepEqual(node.prerequisites, ["BAS-0001"]);
  assert.equal((nodeMap.get("BAS-0001") as {status: string}).status, "ready");
  const article = readAllArticles("content/articles").find(a => a.id === "BAS-0030");
  assert.ok(article);
  assert.equal(article.status, "ready");
  assert.equal(article.slug, "what-is-multimodal");
  assert.equal(article.level, 1);
});

test("BAS-0030 retains its poster and voice story, diagrams, and safe internal links", () => {
  const raw = readFileSync("content/articles/what-is-multimodal.md", "utf8");
  const body = raw.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length > 3800 && body.length < 6500);
  for (const term of ["商店街", "ポスター", "写真", "音声", "文字", "動画",
    "一つのモデル", "複数の仕組み", "数値", "時間の流れ", "研究者"]) {
    assert.ok(body.includes(term), "Missing educational theme " + term);
  }
  assert.ok(body.includes("/articles/what-is-token"));
  assert.ok(body.includes("/articles/what-is-embedding"));
  assert.doesNotMatch(body, /\]\(\/articles\/what-is-ai\)/);
  assert.ok(body.includes("AIとは何か？（準備中）"));
  assert.doesNotMatch(body, /^## 次に読む$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  const headings = [...body.matchAll(/^## (.+)$/gm)].map(x=>x[1]);
  assert.ok(headings.length >= 9);
  for (const heading of headings) assert.ok(heading.length <= 18);
  const cited = [...body.matchAll(/\/images\/articles\/multimodal\/([a-z0-9-]+\.svg)/g)].map(x=>x[1]);
  assert.deepEqual(cited, figures);
  for (const name of figures) {
    const file = path.join("public/images/articles/multimodal", name);
    assert.ok(existsSync(file), "Missing original asset " + name);
    const svg = readFileSync(file, "utf8");
    assert.ok(svg.length > 900);
    assert.match(svg, /<svg/);
    assert.match(svg, /<title id="title">/);
  }
});
