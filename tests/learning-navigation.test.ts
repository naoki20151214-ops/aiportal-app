import assert from "node:assert/strict";
import { test } from "node:test";
import { getNextReadingMarkdown } from "../src/lib/knowledge-registry";

test("AI学習の次に読むは公開状態に応じてリンクと準備中を切り替える", () => {
  const markdown = getNextReadingMarkdown("BAS-0024");
  assert.match(markdown, /^## 次に読む/m);
  assert.match(markdown, /\*\*\[Batch・Epoch・Stepとは？\]\(\/articles\/batch-epoch-step\)\*\*/);
  assert.match(markdown, /\*\*\[AIの推論・Inferenceとは？\]\(\/articles\/ai-inference\)\*\*/);
  assert.match(markdown, /\*\*損失関数とは？\*\* .*（準備中）/);
  assert.match(markdown, /\*\*勾配降下法とは？\*\* .*（準備中）/);
});

test("nextReadingがない記事は空文字を返す", () => {
  assert.equal(getNextReadingMarkdown("BAS-0001"), "");
});

test("プレビューでは既存Transformer記事とAttention記事を相互にリンクし、本番には漏らさない", () => {
  const priorBranch = process.env.CF_PAGES_BRANCH;
  try {
    delete process.env.CF_PAGES_BRANCH;
    const production = getNextReadingMarkdown("BAS-0018");
    assert.match(production, /\\*\\*Transformerとは？\\*\\*.*（準備中）/);
    assert.doesNotMatch(production, /\\[Transformerとは？\\]\\(\\/articles\\/what-is-transformer\\)/);

    process.env.CF_PAGES_BRANCH = "preview/attention-beginner";
    const preview = getNextReadingMarkdown("BAS-0018");
    assert.match(preview, /\\*\\*\\[Transformerとは？\\]\\(\\/articles\\/what-is-transformer\\)\\*\\*/);
    assert.doesNotMatch(preview, /Transformerとは？[^\\n]*（準備中）/);
    assert.match(preview, /Self-Attentionとは？[^\\n]*（準備中）/);
    const transformer = getNextReadingMarkdown("BAS-0017");
    assert.match(transformer, /\\*\\*\\[Attentionとは？\\]\\(\\/articles\\/what-is-attention\\)\\*\\*/);
  } finally {
    if (priorBranch === undefined) delete process.env.CF_PAGES_BRANCH;
    else process.env.CF_PAGES_BRANCH = priorBranch;
  }
});
