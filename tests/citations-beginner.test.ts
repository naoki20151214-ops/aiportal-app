import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const file = "content/articles/ai-citations.md";
const figures = ["hero.webp", "fig-01-mismatch.webp", "fig-02-three-checks.webp", "fig-03-outdated.webp"];

test("GEN-0047 published and follows Grounding", () => {
  const articles = readAllArticles("content/articles");
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const article = articles.find(a => a.id === "GEN-0047");
  const node = registry.nodes.find((n: {id: string}) => n.id === "GEN-0047");
  assert.ok(article);
  assert.ok(node);
  assert.equal(article.status, "published");
  assert.equal(node.status, "published");
  assert.equal(article.slug, "ai-citations");
  assert.equal(article.category, "生成AI");
  assert.equal(article.level, 1);
  assert.deepEqual(node.prerequisites, ["GEN-0046"]);
  assert.equal(articles.find(a => a.id === "GEN-0046")?.status, "published");
  assert.ok(["ready", "published"].includes(articles.find(a => a.id === "GEN-0004")?.status ?? ""));
});

test("Citation beginner article teaches verification, not citation-as-proof", () => {
  const raw = readFileSync(file, "utf8");
  const content = raw.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(content.length >= 3500 && content.length <= 7100, "unexpected length: " + content.length);
  for (const phrase of ["町内会", "午前9時", "公園", "軍手", "飲み物", "無料のお弁当", "[1]", "Citation", "Grounding", "出典", "根拠", "去年", "今回", "比べる", "開く", "見極める", "Google Cloud"]) {
    assert.ok(content.includes(phrase), "missing: " + phrase);
  }
  assert.match(content, /^## ここで迷ったら$/m);
  assert.match(content, /^## 今回のまとめ$/m);
  assert.match(content, /^## 分からなければ戻ろう$/m);
  assert.doesNotMatch(content, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
  const headings = [...content.matchAll(/^## (.+)$/gm)].map(m => m[1]);
  for (const heading of headings) assert.ok(heading.length <= 18, "long H2: " + heading);
  for (const url of ["/articles/ai-grounding", "/articles/ai-hallucination", "/articles/what-is-llm"]) {
    assert.ok(content.includes(url), "missing rewind link: " + url);
  }
  const refs = [...raw.matchAll(/\/images\/articles\/citations\/([a-z0-9-]+\.webp)/g)].map(m => m[1]);
  assert.deepEqual(refs, [figures[0], ...figures]);
  for (const name of figures) {
    const imageFile = path.join("public/images/articles/citations", name);
    assert.ok(existsSync(imageFile), "missing image: " + name);
    const buffer = readFileSync(imageFile);
    assert.ok(buffer.length > 30000, "tiny image: " + name);
    assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
    assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  }
});