import assert from "node:assert/strict";
import { test } from "node:test";
import { getNextReadingMarkdown } from "../src/lib/knowledge-registry";

test("AI学習の次に読むはRegistryから準備中として生成される", () => {
  const markdown = getNextReadingMarkdown("BAS-0024");
  assert.match(markdown, /^## 次に読む/m);
  assert.match(markdown, /\*\*Batch・Epoch・Stepとは？\*\* .*（準備中）/);
  assert.match(markdown, /\*\*AIの推論・Inferenceとは？\*\* .*（準備中）/);
  assert.match(markdown, /\*\*損失関数とは？\*\* .*（準備中）/);
  assert.match(markdown, /\*\*勾配降下法とは？\*\* .*（準備中）/);
});

test("nextReadingがない記事は空文字を返す", () => {
  assert.equal(getNextReadingMarkdown("BAS-0001"), "");
});
