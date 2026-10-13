import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const names = ["hero.svg", "fig-01-desk.svg", "fig-02-contents.svg",
  "fig-03-overflow.svg", "fig-04-memory.svg"];
const articlePath = path.join(process.cwd(), "content/articles/context-window.md");

test("BAS-0023 is published from its existing draft, with a published token prerequisite", () => {
  const article = readAllArticles(path.join(process.cwd(), "content/articles"))
    .find(a => a.id === "BAS-0023");
  assert.ok(article);
  assert.equal(article.slug, "context-window");
  assert.equal(article.status, "published");
  assert.equal(article.level, 1);
  assert.equal(article.type, "concept");
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const byId = new Map<string, { status: string; prerequisites: string[] }>(
    registry.nodes.map((n: { id: string; status: string; prerequisites: string[] }) => [n.id, n] as const));
  const node = byId.get("BAS-0023");
  assert.ok(node);
  assert.equal(node.status, "published");
  assert.deepEqual(node.prerequisites, ["BAS-0013"]);
  assert.equal(byId.get("BAS-0013")?.status, "published");
});

test("BAS-0023 reuses existing travel and desk explanation without changing the body", () => {
  const text = readFileSync(articlePath, "utf8");
  const body = text.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length >= 3200 && body.length <= 6500);
  for (const word of ["電車", "旅行", "画面", "机", "Token", "上限",
    "会話履歴", "メモリ", "コンテキストウィンドウ", "省略", "要約", "エラー"]) {
    assert.ok(body.includes(word), "Missing topic " + word);
  }
  assert.ok(body.includes("/articles/what-is-token"));
  assert.doesNotMatch(body, /^## 次に読む$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  for (const heading of [...body.matchAll(/^## (.*)$/gm)].map(x => x[1])) {
    assert.ok(heading.length <= 18, "Long mobile heading: " + heading);
  }
});

test("Five unmodified original SVG diagrams appear in original order", () => {
  const text = readFileSync(articlePath, "utf8");
  const refs = [...text.matchAll(/!\[[^\]]+\]\(\/images\/articles\/context-window\/([a-z0-9-]+\.svg)\)/g)].map(m => m[1]);
  assert.deepEqual(refs, names);
  for (const name of names) {
    const file = path.join(process.cwd(), "public/images/articles/context-window", name);
    assert.ok(existsSync(file), "Missing SVG " + name);
    const content = readFileSync(file, "utf8");
    assert.ok(content.length > 1000);
    assert.match(content, /<svg/);
    assert.match(content, /<title id="title">/);
  }
});
