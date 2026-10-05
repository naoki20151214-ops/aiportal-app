import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.svg",
  "fig-01-ai-ml-dl.svg",
  "fig-02-feature-learning.svg",
  "fig-03-layers.svg",
  "fig-04-training-loop.svg",
  "fig-05-why-now.svg",
];

test("BAS-0003は最後までLevel 0でDeep Learningの中心を説明する", () => {
  const articlePath = path.join(process.cwd(), "content/articles/what-is-deep-learning.md");
  const article = readFileSync(articlePath, "utf8");

  assert.match(article, /level: 0/);
  assert.match(article, /status: "(review|ready)"/);
  assert.match(article, /thumbnail: "\/images\/articles\/what-is-deep-learning\/hero\.svg"/);
  assert.ok(article.length >= 6_000, "deep learning article is too short");

  assert.match(article, /AIが答えを覚えるだけでなく、答えを出すために何を見ればよいかもDataから学びやすくした/);
  assert.match(article, /Deep Learning = 「何を見るか」まで学習に含める/);
  assert.match(article, /ここまで理解できれば、BAS-0003としては十分です/);

  assert.doesNotMatch(article, /^## Backpropagation/m);
  assert.doesNotMatch(article, /^## Gradient/m);
  assert.doesNotMatch(article, /^## Activation Function/m);
  assert.doesNotMatch(article, /^## Regularization/m);

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/what-is-deep-learning", filename);
    assert.ok(existsSync(asset), `missing deep learning visual: ${filename}`);
    assert.ok(statSync(asset).size > 1_000, `visual unexpectedly small: ${filename}`);
    assert.match(readFileSync(asset, "utf8"), /<svg/);
    assert.match(
      article,
      new RegExp(`/images/articles/what-is-deep-learning/${filename.replace(".", "\\.")}`),
    );
  }
});
