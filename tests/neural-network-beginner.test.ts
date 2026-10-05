import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.svg",
  "fig-01-inputs-to-numbers.svg",
  "fig-02-weighted-inputs.svg",
  "fig-03-layers-flow.svg",
  "fig-04-learning-weights.svg",
  "fig-05-whole-network.svg",
];

test("ニューラルネットワーク記事は初心者向け難易度を維持し6画像を持つ", () => {
  const articlePath = path.join(process.cwd(), "content/articles/what-is-neural-network.md");
  const article = readFileSync(articlePath, "utf8");

  assert.match(article, /level: 1/);
  assert.match(article, /status: "(review|ready)"/);
  assert.match(article, /thumbnail: "\/images\/articles\/what-is-neural-network\/hero\.svg"/);
  const body = article.replace(/^---[\s\S]*?---\s*/, "");
  assert.ok(body.length >= 3_500, "neural network article is too short");
  assert.ok(body.length <= 5_000, "neural network article has become too long for this scope");

  assert.match(article, /たくさんの小さな計算をつないで、入力を少しずつ答えに近い形へ変えていく仕組み/);
  assert.match(article, /Weight = 情報の重要度を調整する数字/);
  assert.match(article, /ここまで理解できれば、ニューラルネットワークの入口としては十分です/);

  assert.doesNotMatch(article, /^## Backpropagation/m);
  assert.doesNotMatch(article, /^## Activation Function/m);
  assert.doesNotMatch(article, /^## Chain Rule/m);
  assert.doesNotMatch(article, /^## Jacobian/m);

  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}\b/);
  assert.doesNotMatch(body, /\b(?:LEVEL|Level)\s*[0-5]\b/);

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/what-is-neural-network", filename);
    assert.ok(existsSync(asset), `missing neural network visual: ${filename}`);
    assert.ok(statSync(asset).size > 1_000, `visual unexpectedly small: ${filename}`);
    assert.match(readFileSync(asset, "utf8"), /<svg/);
    assert.match(
      article,
      new RegExp(`/images/articles/what-is-neural-network/${filename.replace(".", "\\.")}`),
    );
  }
});
