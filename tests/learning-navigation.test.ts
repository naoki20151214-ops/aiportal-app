import assert from "node:assert/strict";
import { test } from "node:test";
import { getNextReadingMarkdown, linkPublishedReadingTargets } from "../src/lib/knowledge-registry";

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


test("hand-written next-reading links follow published Registry status without editing article source", () => {
  const source = [
    "本文には準備中という語があっても、そのまま残す。",
    "## 次に読む",
    "",
    "- **公開済み** — 導線の説明（準備中）",
    "- **審査中** — 未公開の説明（準備中）",
    "",
    "## 参考資料",
    "",
    "- **公開済み** — この行は次に読む欄ではない（準備中）",
  ].join("\n");
  const linked = linkPublishedReadingTargets(source, [
    { title: "公開済み", slug: "published-topic", status: "published" },
    { title: "審査中", slug: "draft-topic", status: "review" },
  ]);
  assert.match(linked, /- \*\*\[公開済み\]\(\/articles\/published-topic\)\*\* — 導線の説明$/m);
  assert.match(linked, /- \*\*審査中\*\* — 未公開の説明（準備中）/);
  assert.match(linked, /## 参考資料\n\n- \*\*公開済み\*\* — この行は次に読む欄ではない（準備中）/);
  assert.match(linked, /^本文には準備中という語があっても、そのまま残す。/);
  assert.equal(source.includes("[公開済み]"), false, "Original manuscript must not be modified");
});

test("inline accepted next-reading notice turns into a link only for a published article", () => {
  const prose = "次は**「プロンプトとは？」（準備中）**で学びます。";
  const nodes = [{ title: "プロンプトとは？", slug: "what-is-prompt", status: "published" }];
  assert.equal(linkPublishedReadingTargets(prose, nodes),
    "次は**[「プロンプトとは？」](/articles/what-is-prompt)**で学びます。");
  assert.equal(linkPublishedReadingTargets(prose, [{ ...nodes[0], status: "ready" }]), prose);
});

test("ambiguous published node titles cannot produce arbitrary links", () => {
  const source = "## 次に読む\n\n- **同名** — 説明（準備中）";
  const nodes = [
    { title: "同名", slug: "first", status: "published" },
    { title: "同名", slug: "second", status: "published" },
  ];
  assert.equal(linkPublishedReadingTargets(source, nodes), source);
});
