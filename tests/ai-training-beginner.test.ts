import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const files = [
  "hero.svg",
  "fig-01-data-and-target.svg",
  "fig-02-loss.svg",
  "fig-03-update-parameters.svg",
  "fig-04-training-loop.svg",
];

test("AI学習記事は短い見出しで流れが分かり初心者向けの長さを守る", () => {
  const articlePath = path.join(process.cwd(), "content/articles/ai-training.md");
  const article = readFileSync(articlePath, "utf8");
  const body = article.replace(/^---[\s\S]*?---\s*/, "");

  assert.match(article, /level: 1/);
  assert.match(article, /status: "(review|ready|published)"/);
  assert.match(article, /thumbnail: "\/images\/articles\/ai-training\/hero\.svg"/);

  assert.ok(body.length >= 2_900, "AI training article is too short");
  assert.ok(body.length <= 4_300, "AI training article is too long for this scope");

  const headings = [...body.matchAll(/^## (.+)$/gm)].map((match) => match[1]);
  assert.deepEqual(headings.slice(0, 9), [
    "まず30秒で結論",
    "最初は何も知らない",
    "Dataを見せる",
    "まず予想する",
    "間違いを測る",
    "少しだけ直す",
    "何度も繰り返す",
    "学習済みModelになる",
    "最後に一本でつなぐ",
  ]);
  for (const heading of headings) {
    assert.ok(heading.length <= 18, `heading is too long for mobile: ${heading}`);
  }

  assert.match(article, /\[ニューラルネットワークとは？\]\(\/articles\/what-is-neural-network\)/);
  assert.doesNotMatch(article, /^## 次に読む$/m);
  assert.match(article, /Dataを使って予想し、間違いが減るようにModelの内部の数字を調整すること/);
  assert.match(article, /Loss = Modelの予想がどれくらいズレているかを表す数字/);
  assert.match(article, /ここまで理解できれば、AIの学習の入口としては十分です/);

  assert.doesNotMatch(body, /\b(?:BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}\b/);
  assert.doesNotMatch(body, /\b(?:LEVEL|Level)\s*[0-5]\b/);

  for (const filename of files) {
    const asset = path.join(process.cwd(), "public/images/articles/ai-training", filename);
    assert.ok(existsSync(asset), `missing AI training visual: ${filename}`);
    assert.ok(statSync(asset).size > 1_000, `visual unexpectedly small: ${filename}`);
    assert.match(readFileSync(asset, "utf8"), /<svg/);
    assert.match(
      article,
      new RegExp(`/images/articles/ai-training/${filename.replace(".", "\\.")}`),
    );
  }
});
