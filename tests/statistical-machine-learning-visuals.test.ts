import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.svg",
  "fig-01-data-model-prediction.svg",
  "fig-02-basic-concept.svg",
  "fig-03-probability-statistics-optimization.svg",
  "fig-04-model-fit-generalization.svg",
  "fig-05-methods.svg",
];

test("統計的機械学習は教科書水準の本文と6画像を持ち、reviewのまま", () => {
  const articlePath = path.join(process.cwd(), "content/articles/statistical-machine-learning.md");
  const article = readFileSync(articlePath, "utf8");

  assert.match(article, /status: "review"/);
  assert.match(article, /thumbnail: "\/images\/articles\/statistical-machine-learning\/hero\.svg"/);
  assert.ok(article.length >= 10000, "statistical machine learning article is too short");

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/statistical-machine-learning", filename);
    assert.ok(existsSync(asset), `missing statistical ML visual: ${filename}`);
    assert.ok(statSync(asset).size > 1_000, `visual unexpectedly small: ${filename}`);
    const svg = readFileSync(asset, "utf8");
    assert.match(svg, /<svg/);
    assert.doesNotMatch(svg, /master\.webp/);
  }

  for (const filename of files) {
    assert.match(
      article,
      new RegExp(`/images/articles/statistical-machine-learning/${filename.replace(".", "\\.")}`),
    );
  }
});
