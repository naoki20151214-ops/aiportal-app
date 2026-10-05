import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.svg",
  "fig-01-matrix-to-tensor.svg",
  "fig-02-image-tensor.svg",
  "fig-03-batch-tensor.svg",
  "fig-04-tensor-shape.svg",
];

test("Tensor記事は短い見出しで流れが分かり初心者向けの長さを守る", () => {
  const articlePath = path.join(process.cwd(), "content/articles/tensor-ai.md");
  const article = readFileSync(articlePath, "utf8");
  const body = article.replace(/^---[\s\S]*?---\s*/, "");

  assert.match(article, /level: 1/);
  assert.match(article, /status: "(review|ready)"/);
  assert.match(article, /thumbnail: "\/images\/articles\/tensor-ai\/hero\.svg"/);

  assert.ok(body.length >= 2_700, "tensor article is too short");
  assert.ok(body.length <= 4_200, "tensor article is too long for this scope");

  const headings = [...body.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(headings.slice(0, 8), [
    "まず30秒で結論",
    "行列だけでは足りない",
    "次元を一つ増やす",
    "画像は3つの軸を持つ",
    "複数枚で軸が増える",
    "Shapeで大きさを見る",
    "GPUでまとめて計算する",
    "最後に一本でつなぐ",
  ]);
  for (const heading of headings) {
    assert.ok(heading.length <= 18, `heading is too long for mobile: ${heading}`);
  }

  assert.match(article, /数字を何次元にも並べたまとまり/);
  assert.match(article, /Shape = 各軸にいくつ数字があるか/);
  assert.match(article, /ここまで理解できれば、Tensorの入口としては十分です/);

  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}\b/);
  assert.doesNotMatch(body, /\b(?:LEVEL|Level)\s*[0-5]\b/);

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/tensor-ai", filename);
    assert.ok(existsSync(asset), `missing tensor visual: ${filename}`);
    assert.ok(statSync(asset).size > 1_000, `visual unexpectedly small: ${filename}`);
    assert.match(readFileSync(asset, "utf8"), /<svg/);
    assert.match(
      article,
      new RegExp(`/images/articles/tensor-ai/${filename.replace(".", "\\.")}`),
    );
  }
});
