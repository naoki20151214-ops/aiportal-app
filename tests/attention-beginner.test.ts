import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { parse } from "yaml";
import { readAllArticles } from "../src/lib/article-content";

const figures = ["hero.webp", "fig-01-context.webp", "fig-02-distance.webp",
  "fig-03-weights.webp", "fig-04-mix.webp", "fig-05-mask.webp"];
const folder = path.join(process.cwd(), "public/images/articles/attention");

test("BAS-0018 is published, matches the Registry and follows Transformer", () => {
  const articles = readAllArticles(path.join(process.cwd(), "content/articles"));
  const a = articles.find(x => x.id === "BAS-0018");
  assert.ok(a);
  assert.equal(a.slug, "what-is-attention");
  assert.equal(a.status, "published");
  assert.equal(a.level, 2);
  assert.equal(a.type, "mechanism");
  const nodes = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8")).nodes;
  const n = nodes.find((x: { id: string }) => x.id === "BAS-0018");
  assert.ok(n);
  assert.equal(n.status, "published");
  assert.deepEqual(n.prerequisites, ["BAS-0017"]);
  assert.equal(nodes.find((x: { id: string }) => x.id === "BAS-0017")?.status, "published");
  assert.deepEqual(n.nextReading.map((x: { id: string }) => x.id), ["BAS-0019", "BAS-0017"]);
});

test("Attention explains weights, information integration and causal limits", () => {
  const raw = readFileSync("content/articles/what-is-attention.md", "utf8");
  const body = raw.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length >= 4500 && body.length < 8500);
  for (const phrase of ["赤い帽子", "青い靴", "かぶって", "履いて", "Attention", "Token",
      "Embedding", "重み", "数値情報", "ベクトル", "Token ID", "Causal Mask",
      "Self-Attention", "Query", "Key", "Value", "未来の位置を参照できない", "前後両方向"]) {
    assert.ok(body.includes(phrase), "missing: " + phrase);
  }
  assert.doesNotMatch(body, /青い帽子|赤い靴|0\.8|0\.2|^## 最後に一本でつなぐ$/m);
  for (const u of ["/articles/what-is-token", "/articles/what-is-embedding", "/articles/what-is-transformer"])
    assert.ok(body.includes(u));
  assert.doesNotMatch(body, /^## 次に読む$/m);
  for (const h of [...body.matchAll(/^## (.+)$/gm)].map(x => x[1]))
    assert.ok(h.length <= 18, "Long mobile heading: " + h);
});

test("All six approved WebP illustrations are referenced in order and valid", () => {
  const raw = readFileSync("content/articles/what-is-attention.md", "utf8");
  assert.match(raw, /^thumbnail: "\/images\/articles\/attention\/hero.webp"$/m);
  const refs = [...raw.matchAll(/!\[[^\]]+\]\(\/images\/articles\/attention\/([a-z0-9-]+\.webp)\)/g)]
      .map(x => x[1]);
  assert.deepEqual(refs, figures);
  for (const name of figures) {
    const f = path.join(folder, name);
    assert.ok(existsSync(f), "Missing illustration: " + name);
    const b = readFileSync(f);
    assert.ok(b.byteLength > 25000, "WebP too small: " + name);
    assert.equal(b.toString("ascii", 0, 4), "RIFF");
    assert.equal(b.toString("ascii", 8, 12), "WEBP");
  }
});