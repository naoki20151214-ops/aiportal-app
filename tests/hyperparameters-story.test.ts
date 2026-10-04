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

test("ハイパーパラメータ記事はストーリー型本文と6画像を持ち、reviewまたはreadyのまま", () => {
  const articlePath = path.join(process.cwd(), "content/articles/hyperparameters.md");
  const article = readFileSync(articlePath, "utf8");

  assert.match(article, /status: "(review|ready)"/);
  assert.match(article, /thumbnail: "\/images\/articles\/hyperparameters\/hero\.svg"/);
  assert.ok(article.length >= 12_000, "hyperparameters article is too short");
  assert.match(article, /同じTraining Dataを使う/);
  assert.match(article, /2012年：「全部きれいに試す」より、Randomの方が強いことがある/);
  assert.match(article, /Trainingしながら設定まで進化させるPBT/);
  assert.match(article, /TemperatureやTop-pは、厳密には別の話/);

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
