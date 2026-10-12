import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { test } from "node:test";
import ArticleDifficulty from "../src/components/article-difficulty";

test("読者向け難易度は内部Level 0〜5を1〜6個の星へ変換する", () => {
  const beginner = renderToStaticMarkup(createElement(ArticleDifficulty, { level: 0 }));
  assert.match(beginner, /難易度 1\/6 入門/);
  assert.match(beginner, /★/);
  assert.match(beginner, /☆☆☆☆☆/);

  const research = renderToStaticMarkup(createElement(ArticleDifficulty, { level: 5 }));
  assert.match(research, /難易度 6\/6 研究/);
  assert.match(research, /★★★★★★/);
});
