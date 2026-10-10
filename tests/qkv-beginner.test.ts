import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const articlePath = path.join(process.cwd(), "content/articles/query-key-value.md");
const figures = [
  "hero.svg", "fig-01-two-jobs.svg", "fig-02-query-key.svg",
  "fig-03-value.svg", "fig-04-three-vectors.svg", "fig-05-weighted-sum.svg",
];

test("QKVは専用review記事で、合格済みの既存教材はreadyを維持する", () => {
  const articles = readAllArticles(path.join(process.cwd(), "content/articles"));
  const qkv = articles.find(article => article.id === "BAS-0101");
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const nodes = new Map(registry.nodes.map((n: { id: string }) => [n.id, n]));
  assert.ok(qkv);
  assert.equal(qkv.status, "review");
  assert.equal(qkv.slug, "query-key-value");
  assert.equal(qkv.level, 2);
  assert.equal(qkv.type, "mechanism");
  assert.equal((nodes.get("BAS-0101") as {status:string}).status, "review");
  assert.equal((nodes.get("BAS-0019") as {status:string}).status, "ready");
  assert.equal((nodes.get("BAS-0023") as {status:string}).status, "ready");
  assert.equal((nodes.get("BAS-0017") as {status:string}).status, "review");
  assert.equal(registry.nodeCount, 501);
  assert.equal(registry.nodes.length, 501);
  assert.ok((nodes.get("BAS-0019") as {nextReading: {id:string}[]}).nextReading.some(item => item.id === "BAS-0101"));
  assert.ok((nodes.get("BAS-0020") as {prerequisites:string[]}).prerequisites.includes("BAS-0101"));
});

test("Query/Keyが重み、Valueが数値情報という役割を具体例から理解できる", () => {
  const full = readFileSync(articlePath, "utf8");
  const body = full.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length > 4200 && body.length < 6000);
  assert.match(body.slice(0, 700), /赤い帽子を買った/);
  const required = [
    "Query", "Key", "Value", "重み", "ベクトル",
    "取り込む", "学習済み", "Token", "75%", "25%",
    "[1.5, 1.0]", "実在するAIとは関係のない架空の数値"
  ];
  for (const word of required) assert.ok(body.includes(word), "missing: " + word);
  assert.match(body, /QとKで重みを決める。Vをその重みで組み合わせる/);
  assert.match(body, /「赤い」という日本語の意味そのものでも/);
  const headings = [...body.matchAll(/^## (.*)$/gm)].map(x => x[1]);
  for (const heading of headings) assert.ok(heading.length <= 18, "long mobile H2: " + heading);
  assert.doesNotMatch(body, /^## 次に読む$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);

  for (const link of [
    "/articles/self-attention",
    "/articles/what-is-embedding",
  ]) assert.ok(body.includes(link));

  const referenced = [...body.matchAll(/\/images\/articles\/qkv\/([a-z0-9-]+\.svg)/g)].map(x => x[1]);
  assert.deepEqual(referenced, figures);
  for (const filename of figures) {
    const p = path.join(process.cwd(), "public/images/articles/qkv", filename);
    assert.ok(existsSync(p), "missing: " + filename);
    const svg = readFileSync(p, "utf8");
    assert.ok(svg.length > 1100);
    assert.match(svg, /<svg/);
    assert.match(svg, /<title id="title">/);
  }
});
