import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.svg",
  "fig-01-probability-scale.svg",
  "fig-02-candidate-distribution.svg",
  "fig-03-information-update.svg",
  "fig-04-calibration.svg",
  "fig-05-llm-next-token.svg",
];

test("確率記事は初心者向け前半で一度完結し、後半に深掘りと6画像を持つ", () => {
  const articlePath = path.join(process.cwd(), "content/articles/probability-for-ai.md");
  const article = readFileSync(articlePath, "utf8");

  assert.match(article, /status: "(review|ready)"/);
  assert.match(article, /thumbnail: "\/images\/articles\/probability-for-ai\/hero\.svg"/);
  assert.ok(article.length >= 8_000, "probability article is too short");
  assert.match(article, /猫：99%/);
  assert.match(article, /猫：51%/);
  assert.match(article, /確率 = AIが「分からなさ」を数字で扱うためのもの/);
  assert.match(article, /ここまで読めば、いったん十分です/);
  assert.match(article, /ここから先は、もう少し深く知りたい人へ/);
  assert.match(article, /99%と出たら、本当に99%正しいのか/);
  assert.match(article, /LLMは次のToken候補をどう扱うのか/);

  const body = article.replace(/^---[\s\S]*?---\s*/, "");
  const beginnerSection = body.split("\n---\n")[0];
  assert.doesNotMatch(beginnerSection, /Joint Probability/);
  assert.doesNotMatch(beginnerSection, /Marginal Probability/);
  assert.doesNotMatch(beginnerSection, /Aleatoric Uncertainty/);
  assert.doesNotMatch(beginnerSection, /Epistemic Uncertainty/);

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/probability-for-ai", filename);
    assert.ok(existsSync(asset), `missing probability visual: ${filename}`);
    assert.ok(statSync(asset).size > 1_000, `visual unexpectedly small: ${filename}`);
    const svg = readFileSync(asset, "utf8");
    assert.match(svg, /<svg/);
    assert.match(
      article,
      new RegExp(`/images/articles/probability-for-ai/${filename.replace(".", "\\.")}`),
    );
  }
});
