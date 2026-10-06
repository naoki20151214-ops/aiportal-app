import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.svg",
  "fig-01-batch.svg",
  "fig-02-step.svg",
  "fig-03-epoch.svg",
  "fig-04-repeat-epochs.svg",
];

test("Batch・Epoch・Step記事は具体例から3概念を一本で理解できる", () => {
  const articlePath = path.join(process.cwd(), "content/articles/batch-epoch-step.md");
  const article = readFileSync(articlePath, "utf8");
  const body = article.replace(/^---[\s\S]*?---\s*/, "");

  assert.match(article, /level: 1/);
  assert.match(article, /status: "(review|ready)"/);
  assert.match(article, /thumbnail: "\/images\/articles\/batch-epoch-step\/hero\.svg"/);
  assert.match(body, /\[AIの学習とは？\]\(\/articles\/ai-training\)/);

  assert.ok(body.length >= 2_900, "Batch/Epoch/Step article is too short");
  assert.ok(body.length <= 4_600, "Batch/Epoch/Step article is too long for this scope");

  const headings = [...body.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(headings.slice(0, 8), [
    "1000枚をどう使う？",
    "100枚ずつに分ける",
    "1回進むと1 Step",
    "10回で1 Epoch",
    "5周なら5 Epoch",
    "3つを一本でつなぐ",
    "なぜ分けて学ぶ？",
    "最後にもう一度",
  ]);
  for (const heading of headings) {
    assert.ok(heading.length <= 18, `heading is too long for mobile: ${heading}`);
  }

  assert.match(body, /Batch Size = 100/);
  assert.match(body, /10 Step = 1 Epoch/);
  assert.match(body, /5 Epoch × 10 Step = 50 Step/);
  assert.match(body, /BatchはDataの分け方/);
  assert.match(body, /StepはTrainingが進む回数/);
  assert.match(body, /EpochはData全体を何周したか/);

  assert.doesNotMatch(body, /^## 次に読む$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}\b/);
  assert.doesNotMatch(body, /\b(?:LEVEL|Level)\s*[0-5]\b/);

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/batch-epoch-step", filename);
    assert.ok(existsSync(asset), `missing Batch/Epoch/Step visual: ${filename}`);
    assert.ok(statSync(asset).size > 1_000, `visual unexpectedly small: ${filename}`);
    assert.match(readFileSync(asset, "utf8"), /<svg/);
    assert.match(
      article,
      new RegExp(`/images/articles/batch-epoch-step/${filename.replace(".", "\\.")}`),
    );
  }
});
