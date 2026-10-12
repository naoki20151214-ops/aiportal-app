import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.webp",
  "fig-01-basic.webp",
  "fig-02-knowledge-representation.webp",
  "fig-03-inference.webp",
  "fig-04-expert-applications.webp",
  "fig-05-rule-based.webp",
];

test("シンボリックAIは教科書水準の本文と6画像を持ち、reviewのまま", () => {
  const articlePath = path.join(process.cwd(), "content/articles/symbolic-ai.md");
  const article = readFileSync(articlePath, "utf8");

  assert.match(article, /status: "review"/);
  assert.match(article, /thumbnail: "\/images\/articles\/symbolic-ai\/hero\.webp"/);
  assert.ok(article.length >= 8000, "symbolic-ai article is too short");

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/symbolic-ai", filename);
    assert.ok(existsSync(asset), `missing symbolic AI visual: ${filename}`);
    assert.ok(statSync(asset).size > 30_000, `symbolic AI visual unexpectedly small: ${filename}`);
    assert.match(article, new RegExp(`/images/articles/symbolic-ai/${filename.replace(".", "\\.")}`));
  }
});
