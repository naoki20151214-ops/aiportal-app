import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.svg",
  "fig-01-three-roles.svg",
  "fig-02-test-contamination.svg",
  "fig-03-time-series.svg",
  "fig-04-data-leakage.svg",
  "fig-05-real-world.svg",
];

test("訓練・検証・テスト記事はストーリー型本文と6画像を持ち、reviewのまま", () => {
  const articlePath = path.join(process.cwd(), "content/articles/train-validation-test-split.md");
  const article = readFileSync(articlePath, "utf8");

  assert.match(article, /status: "review"/);
  assert.match(article, /thumbnail: "\/images\/articles\/train-validation-test-split\/hero\.svg"/);
  assert.ok(article.length >= 10000, "train/validation/test article is too short");
  assert.match(article, /練習問題では満点/);
  assert.match(article, /Test Set：最後の封印/);

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/train-validation-test-split", filename);
    assert.ok(existsSync(asset), `missing train/validation/test visual: ${filename}`);
    assert.ok(statSync(asset).size > 1_000, `visual unexpectedly small: ${filename}`);
    const svg = readFileSync(asset, "utf8");
    assert.match(svg, /<svg/);
    assert.match(article, new RegExp(`/images/articles/train-validation-test-split/${filename.replace(".", "\\.")}`));
  }
});
