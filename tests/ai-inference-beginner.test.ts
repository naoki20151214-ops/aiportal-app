import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = ["hero.svg","fig-01-input.svg","fig-02-trained-model.svg","fig-03-output.svg","fig-04-training-vs-inference.svg"];

test("AI推論記事は新しい入力から回答までを初心者向けに一本で説明する", () => {
  const articlePath = path.join(process.cwd(), "content/articles/ai-inference.md");
  const article = readFileSync(articlePath, "utf8");
  const body = article.replace(/^---[\s\S]*?---\s*/, "");
  assert.match(article, /level: 1/);
  assert.match(article, /status: "(review|ready|published)"/);
  assert.match(article, /thumbnail: "\/images\/articles\/ai-inference\/hero\.svg"/);
  assert.match(body, /\[AIの学習とは？\]\(\/articles\/ai-training\)/);
  assert.match(body, /\[Tensorとは？\]\(\/articles\/tensor-ai\)/);
  assert.ok(body.length >= 2_900);
  assert.ok(body.length <= 4_500);
  const headings = [...body.matchAll(/^## (.+)$/gm)].map((m) => m[1]);
  assert.deepEqual(headings.slice(0, 7), ["新しい写真を見せる","入力を数字にする","学習済みModelで計算","予測が出てくる","Trainingとは何が違う？","ChatGPTでも推論する","最後に一本でつなぐ"]);
  for (const heading of headings) assert.ok(heading.length <= 18, `heading too long: ${heading}`);
  assert.match(body, /Training = 学ぶ/);
  assert.match(body, /Inference = 学んだものを使う/);
  assert.match(body, /AIが学んだことを、実際の入力に使う段階/);
  assert.doesNotMatch(body, /^## 次に読む$/m);
  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}\b/);
  assert.doesNotMatch(body, /\b(?:LEVEL|Level)\s*[0-5]\b/);
  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/ai-inference", filename);
    assert.ok(existsSync(asset), `missing visual: ${filename}`);
    assert.ok(statSync(asset).size > 1_000, `visual too small: ${filename}`);
    assert.match(readFileSync(asset, "utf8"), /<svg/);
    assert.match(article, new RegExp(`/images/articles/ai-inference/${filename.replace(".", "\\.")}`));
  }
});