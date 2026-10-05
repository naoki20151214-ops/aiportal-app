import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.svg",
  "fig-01-parameter-vs-hyperparameter.svg",
  "fig-02-learning-rate.svg",
  "fig-03-grid-vs-random.svg",
  "fig-04-tuning-loop.svg",
  "fig-05-pbt.svg",
];

test("ハイパーパラメータ記事は初心者が冒頭だけで理解でき、深掘りと6画像も持つ", () => {
  const articlePath = path.join(process.cwd(), "content/articles/hyperparameters.md");
  const article = readFileSync(articlePath, "utf8");

  assert.match(article, /status: "(review|ready)"/);
  assert.match(article, /thumbnail: "\/images\/articles\/hyperparameters\/hero\.svg"/);
  assert.ok(article.length >= 8_000, "hyperparameters article is too short");
  assert.match(article, /AIに、\*\*犬と猫を見分けさせたい\*\*/);
  assert.match(article, /ハイパーパラメータ = AIの学ばせ方を決める設定/);
  assert.match(article, /ここまで読めば、いったん十分です/);
  assert.match(article, /ここから先は、もう少し深く知りたい人へ/);
  assert.match(article, /2012年：Random Searchという意外な答え/);
  assert.match(article, /2017年：Trainingしながら設定も変えるPBT/);

  const body = article.replace(/^---[\s\S]*?---\s*/, "");
  const beginnerSection = body.split("\n---\n")[0];
  assert.doesNotMatch(beginnerSection, /Bayesian Optimization/);
  assert.doesNotMatch(beginnerSection, /Population Based Training/);

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/hyperparameters", filename);
    assert.ok(existsSync(asset), `missing hyperparameters visual: ${filename}`);
    assert.ok(statSync(asset).size > 1_000, `visual unexpectedly small: ${filename}`);
    const svg = readFileSync(asset, "utf8");
    assert.match(svg, /<svg/);
    assert.match(
      article,
      new RegExp(`/images/articles/hyperparameters/${filename.replace(".", "\\.")}`),
    );
  }
});
