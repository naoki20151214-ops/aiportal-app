import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const articlePath = path.join(process.cwd(), "content/articles/context-window.md");
const assets = [
  "hero.svg", "fig-01-desk.svg", "fig-02-contents.svg",
  "fig-03-overflow.svg", "fig-04-memory.svg",
];
const registry = () => parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));

test("コンテキストウィンドウ記事は合格済みreadyでRegistryと一致する", () => {
  const all = readAllArticles("content/articles");
  const node = registry().nodes.find((x: { id: string }) => x.id === "BAS-0023");
  const article = all.find((x) => x.id === "BAS-0023");
  assert.ok(article);
  assert.ok(node);
  assert.equal(article.status, "ready");
  assert.equal(node.status, "ready");
  assert.equal(article.slug, "context-window");
  assert.equal(article.level, 1);
  assert.equal(article.type, "concept");
  assert.equal(node.category, article.category);
});

test("机と旅行の例からToken・情報上限・履歴・メモリの違いを順序よく説明する", () => {
  const source = readFileSync(articlePath, "utf8");
  const body = source.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length >= 3200 && body.length <= 6500);
  for (const phrase of ["電車","旅行","画面","机","Token","上限","会話履歴","メモリ","コンテキストウィンドウ","省略","要約","エラー"]) {
    assert.ok(body.includes(phrase), "missing beginner concept: " + phrase);
  }
  const headings = [...body.matchAll(/^## (.*)$/gm)].map(x => x[1]);
  for (const h of headings) assert.ok(h.length <= 18, "mobile heading too long: " + h);
  assert.ok(body.includes("/articles/what-is-token"));
  assert.doesNotMatch(body, /^## 次に読む$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  const mentions = [...body.matchAll(/\/images\/articles\/context-window\/([a-z0-9-]+\.svg)/g)].map(x=>x[1]);
  assert.deepEqual(mentions, assets);
  for (const name of assets) {
    const file = path.join(process.cwd(), "public/images/articles/context-window", name);
    assert.ok(existsSync(file), "missing figure " + name);
    const svg = readFileSync(file, "utf8");
    assert.ok(svg.length > 1000);
    assert.match(svg, /<svg/);
    assert.match(svg, /<title id="title">/);
  }
});

test("100記事の枠外にQKVの専用Nodeを追加し、後続Multi-Headへ接続する", () => {
  const data = registry();
  const ids = new Set(data.nodes.map((node: {id:string})=>node.id));
  assert.equal(data.nodeCount, data.nodes.length);
  assert.ok(data.nodeCount > 500);
  const qkv = data.nodes.find((x: {id:string})=>x.id==="BAS-0101");
  const self = data.nodes.find((x: {id:string})=>x.id==="BAS-0019");
  const multi = data.nodes.find((x: {id:string})=>x.id==="BAS-0020");
  assert.ok(qkv);
  assert.ok(self);
  assert.ok(multi);
  assert.equal(qkv.status, "review");
  assert.equal(qkv.slug, "query-key-value");
  assert.deepEqual(qkv.prerequisites, ["BAS-0019"]);
  assert.ok(self.nextReading.some((item: {id:string})=>item.id==="BAS-0101"));
  assert.ok(multi.prerequisites.includes("BAS-0101"));
  for (const id of qkv.prerequisites) assert.ok(ids.has(id));
});
