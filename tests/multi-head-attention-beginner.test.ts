import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const articlePath = path.join(process.cwd(), "content/articles/multi-head-attention.md");
const figures = ["hero.svg", "fig-01-heads.svg", "fig-02-projections.svg", "fig-03-merge.svg"];

test("Multi-Headはreview、QKVはreviewのままで前提記事を勝手に公開しない", () => {
  const articles = readAllArticles(path.join(process.cwd(), "content/articles"));
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const node = registry.nodes.find((n: {id:string}) => n.id === "BAS-0020");
  const article = articles.find(a => a.id === "BAS-0020");
  assert.ok(node);
  assert.ok(article);
  assert.equal(article.slug, "multi-head-attention");
  assert.equal(article.status, "review");
  assert.equal(node.status, "review");
  assert.deepEqual(node.prerequisites, ["BAS-0019", "BAS-0101"]);
  assert.equal(articles.find(a => a.id === "BAS-0101")?.status, "review");
  assert.equal(articles.find(a => a.id === "BAS-0019")?.status, "ready");
  assert.equal(articles.find(a => a.id === "BAS-0023")?.status, "ready");
});

test("複数Headの意義を一つの例で説明し、復習導線と図解を備える", () => {
  const body = readFileSync(articlePath, "utf8").replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length >= 3600 && body.length <= 6000);
  assert.match(body.slice(0, 650), /赤くて小さな帽子/);
  for (const required of ["一つのAttentionでも", "学習済み", "異なる", "Head", "結合", "数値", "未来", "重み", "固定されるわけではありません"]) {
    assert.ok(body.includes(required), "missing: " + required);
  }
  assert.match(body, /^## ここで迷ったら$/m);
  assert.match(body, /^## 分からなければ戻ろう$/m);
  for (const link of ["/articles/self-attention", "/articles/what-is-attention", "/articles/query-key-value", "/articles/what-is-embedding"]) {
    assert.ok(body.includes(link), "missing link: " + link);
  }
  for (const heading of [...body.matchAll(/^## (.+)$/gm)].map(x => x[1])) {
    assert.ok(heading.length <= 18, "heading too long: " + heading);
  }
  assert.doesNotMatch(body, /^## 次に読む$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  const figureRefs = [...body.matchAll(/\/images\/articles\/multi-head-attention\/([a-z0-9-]+\.svg)/g)].map(x => x[1]);
  assert.deepEqual(figureRefs, figures);
  for (const filename of figures) {
    const p = path.join(process.cwd(), "public/images/articles/multi-head-attention", filename);
    assert.ok(existsSync(p), "missing figure: " + filename);
    const svg = readFileSync(p, "utf8");
    assert.ok(svg.length > 1300);
    assert.match(svg, /<svg/);
    assert.match(svg, /<title id="t">/);
  }
});
