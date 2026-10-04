import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.jpg",
  "fig-01-hierarchy.jpg",
  "fig-02-system.jpg",
  "fig-03-ai-map.jpg",
  "fig-04-strengths.jpg",
  "fig-05-history.webp",
];

test("機械学習記事は教科書水準の本文と6画像を持ち、reviewのまま", () => {
  const articlePath = path.join(process.cwd(), "content/articles/what-is-machine-learning.md");
  const article = readFileSync(articlePath, "utf8");

  assert.match(article, /status: "review"/);
  assert.match(article, /thumbnail: "\/images\/articles\/what-is-machine-learning\/hero\.jpg"/);
  assert.ok(article.length >= 10000, "machine learning article is too short");

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/what-is-machine-learning", filename);
    assert.ok(existsSync(asset), `missing machine learning visual: ${filename}`);
    assert.ok(statSync(asset).size > 30_000, `machine learning visual unexpectedly small: ${filename}`);
    assert.match(article, new RegExp(`/images/articles/what-is-machine-learning/${filename.replace(".", "\\.")}`));
  }
});
