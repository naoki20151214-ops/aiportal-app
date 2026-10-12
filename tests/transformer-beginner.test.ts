import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";

const mdPath = path.join(process.cwd(), "content/articles/what-is-transformer.md");
const hero = "hero-red-hat.webp";

test("BAS-0017 stays under review and keeps a single approved red-hat illustration", () => {
  const article = readFileSync(mdPath, "utf8");
  const body = article.replace(/^---[\s\S]*?---\s*/, "");
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const node = registry.nodes.find((n: { id: string }) => n.id === "BAS-0017");
  assert.ok(node);
  assert.equal(node.status, "review");
  assert.match(article, /id: "BAS-0017"/);
  assert.match(article, /status: "review"/);
  assert.match(article, /level: 1/);
  assert.match(article, /thumbnail: "\/images\/articles\/transformer\/hero-red-hat.webp"/);
  assert.ok(body.length >= 3500 && body.length <= 5600, `unexpected body length: ${body.length}`);
  assert.equal((body.match(/\]\(\/images\/articles\/transformer\/hero-red-hat.webp\)/g) ?? []).length, 1);
  assert.doesNotMatch(body, /\/images\/articles\/transformer\/[a-z0-9-]+\.svg/);
  const file = path.join(process.cwd(), "public/images/articles/transformer", hero);
  assert.ok(existsSync(file), `approved hero missing: ${hero}`);
  const img = readFileSync(file);
  assert.ok(img.length >= 50000);
  assert.equal(img.toString("ascii", 0, 4), "RIFF");
  assert.equal(img.toString("ascii", 8, 12), "WEBP");
});

test("BAS-0017 teaches Transformer using one accessible example and avoids causal attention misconceptions", () => {
  const body = readFileSync(mdPath, "utf8").replace(/^---[\s\S]*?---\s*/, "");
  for (const phrase of ["赤い帽子", "それ", "トークン", "トークンID", "数値表現", "Embedding", "Attention", "位置", "RNN", "LLM", "Decoder型", "未来の単語", "一度に全部"])
    assert.ok(body.includes(phrase), `missing: ${phrase}`);
  for (const path of ["/articles/what-is-token", "/articles/what-is-embedding", "/articles/vectors-for-ai", "/articles/what-is-language-model"])
    assert.ok(body.includes(path), `missing learning link: ${path}`);
  for (const h of ["## ここで迷ったら", "## 今回のまとめ", "## 分からなければ戻ろう"])
    assert.ok(body.includes(h), `missing editorial heading: ${h}`);
  for (const [, heading] of body.matchAll(/^## (.+)$/gm))
    assert.ok(heading.length <= 18, `long heading: ${heading}`);
  assert.doesNotMatch(body, /Q・K・Vの計算式|Transformerは必ず未来の単語を参照/);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC)-\d{4}\b/);
});