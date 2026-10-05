import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.svg",
  "fig-01-numbers-to-matrix.svg",
  "fig-02-matrix-transform.svg",
  "fig-03-weight-matrix.svg",
  "fig-04-layers-matrix.svg",
];

test("行列計算記事は短い見出しで流れが分かり初心者向けの長さを守る", () => {
  const articlePath = path.join(process.cwd(), "content/articles/matrix-multiplication-ai.md");
  const article = readFileSync(articlePath, "utf8");
  const body = article.replace(/^---[\s\S]*?---\s*/, "");

  assert.match(article, /level: 1/);
  assert.match(article, /status: "(review|ready|published)"/);
  assert.match(article, /thumbnail: "\/images\/articles\/matrix-multiplication-ai\/hero\.svg"/);

  assert.ok(body.length >= 3_000, "matrix article is too short");
  assert.ok(body.length <= 4_500, "matrix article is too long for this scope");

  const headings = [...body.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(headings.slice(0, 8), [
    "まず30秒で結論",
    "数字が多すぎる",
    "数字を表にまとめる",
    "行列で一気に変える",
    "Weightも表になる",
    "Layerは変換の連続",
    "GPUが計算を支える",
    "最後に一本でつなぐ",
  ]);
  for (const heading of headings) {
    assert.ok(heading.length <= 18, `heading is too long for mobile: ${heading}`);
  }

  assert.match(article, /行列は、簡単に言えば/);
  assert.match(article, /行列の掛け算 = たくさんの入力をまとめて、新しい数字のまとまりへ変換する方法/);
  assert.match(article, /ここまで理解できれば、行列計算とAIの入口としては十分です/);

  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}\b/);
  assert.doesNotMatch(body, /\b(?:LEVEL|Level)\s*[0-5]\b/);

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/matrix-multiplication-ai", filename);
    assert.ok(existsSync(asset), `missing matrix visual: ${filename}`);
    assert.ok(statSync(asset).size > 1_000, `visual unexpectedly small: ${filename}`);
    assert.match(readFileSync(asset, "utf8"), /<svg/);
    assert.match(
      article,
      new RegExp(`/images/articles/matrix-multiplication-ai/${filename.replace(".", "\\.")}`),
    );
  }
});
