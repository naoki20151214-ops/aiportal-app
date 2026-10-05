import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const usedFiles = [
  "hero.svg",
  "fig-01-probability-scale.svg",
  "fig-02-candidate-distribution.svg",
  "fig-03-information-update.svg",
  "fig-05-llm-next-token.svg",
];

test("BAS-0056は最後までLevel 1初心者向けで、深掘りを後続記事へ渡す", () => {
  const articlePath = path.join(process.cwd(), "content/articles/probability-for-ai.md");
  const article = readFileSync(articlePath, "utf8");

  assert.match(article, /level: 1/);
  assert.match(article, /status: "(review|ready)"/);
  assert.match(article, /thumbnail: "\/images\/articles\/probability-for-ai\/hero\.svg"/);
  assert.ok(article.length >= 5_000, "probability article is too short");

  assert.match(article, /猫：99%/);
  assert.match(article, /猫：51%/);
  assert.match(article, /確率 = AIが「分からなさ」を数字で扱うためのもの/);
  assert.match(article, /ここまで理解できれば、AIで確率を考えるための入口としては十分です/);

  assert.doesNotMatch(article, /^## Random Variable/m);
  assert.doesNotMatch(article, /^## Probability Distribution/m);
  assert.doesNotMatch(article, /^## Conditional Probability/m);
  assert.doesNotMatch(article, /^## Joint Probability/m);
  assert.doesNotMatch(article, /^## Bayes/m);
  assert.doesNotMatch(article, /^## Expectation/m);
  assert.doesNotMatch(article, /^## Variance/m);
  assert.doesNotMatch(article, /Aleatoric Uncertainty/);
  assert.doesNotMatch(article, /Epistemic Uncertainty/);

  assert.match(article, /確率分布とは？/);
  assert.match(article, /Entropyとは？/);
  assert.match(article, /Cross Entropyとは？/);
  assert.match(article, /モデルのCalibrationとは？/);
  assert.match(article, /Bayesian Inferenceとは？/);

  for (const filename of usedFiles) {
    const asset = path.join(process.cwd(), "public/images/articles/probability-for-ai", filename);
    assert.ok(existsSync(asset), `missing probability visual: ${filename}`);
    assert.ok(statSync(asset).size > 1_000, `visual unexpectedly small: ${filename}`);
    assert.match(readFileSync(asset, "utf8"), /<svg/);
    assert.match(
      article,
      new RegExp(`/images/articles/probability-for-ai/${filename.replace(".", "\\.")}`),
    );
  }
});
