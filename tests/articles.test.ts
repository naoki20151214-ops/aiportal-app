import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, rmdirSync, unlinkSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { parseArticle, readAllArticles, readArticles } from "../src/lib/article-content";
import { getCategories } from "../src/lib/categories";

function fixture(overrides: Record<string, unknown> = {}, body = "## 基礎\n\n本文です。") {
  const metadata = {
    title: "AIの基礎", slug: "ai-basics", description: "AIを学ぶための入門記事。",
    category: "AI基礎・技術", publishedAt: "2026-10-01", updatedAt: "2026-10-02",
    author: "編集部", thumbnail: "/images/ai.jpg", tags: ["AI", "入門"],
    ...overrides,
  };
  return `---\n${Object.entries(metadata).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join("\n")}\n---\n\n${body}`;
}

test("日本語、YAMLの引用符、Windows改行、BOMを含む記事を読める", () => {
  const article = parseArticle("\uFEFF" + fixture({ title: 'AI: 「はじめて」の学習' }).replace(/\n/g, "\r\n"), "article.md");
  assert.equal(article.title, 'AI: 「はじめて」の学習');
  assert.deepEqual(article.tags, ["AI", "入門"]);
  assert.match(article.content, /## 基礎/);
});

test("すべての必須フィールドの記入漏れをファイル名付きで知らせる", () => {
  for (const field of ["title", "slug", "description", "category", "publishedAt", "updatedAt", "author", "thumbnail", "tags"]) {
    assert.throws(() => parseArticle(fixture({ [field]: null }), "missing.md"), /記事 missing\.md:/);
  }
});

test("存在しない日付と公開日より前の更新日を拒否する", () => {
  for (const publishedAt of ["2026-02-30", "2026-13-01", "2026/10/01"]) {
    assert.throws(() => parseArticle(fixture({ publishedAt }), "date.md"), /YYYY-MM-DD/);
  }
  assert.throws(() => parseArticle(fixture({ updatedAt: "2026-09-30" }), "date.md"), /以降/);
});

test("URLに使えないslugと危険な画像URLを拒否する", () => {
  for (const slug of ["../secret", "ai/basics", "AI Basics", "ai--basics", ""]) {
    assert.throws(() => parseArticle(fixture({ slug }), "slug.md"));
  }
  for (const thumbnail of ["javascript:alert(1)", "//example.com/image.jpg", "/\\example.com/image.jpg", "image.jpg", "https://user:pass@example.com/a.jpg"]) {
    assert.throws(() => parseArticle(fixture({ thumbnail }), "image.md"));
  }
});

test("定義外のカテゴリーを拒否する", () => {
  assert.throws(() => parseArticle(fixture({ category: "ChatGPT" }), "category.md"), /category/);
});

test("status付き記事はRegistryメタ情報を要求し、reviewは公開一覧に出さない", () => {
  const review = parseArticle(fixture({
    id: "BAS-0001", level: 0, type: "concept", status: "review",
  }), "review.md");
  assert.equal(review.status, "review");
  assert.equal(review.id, "BAS-0001");

  for (const overrides of [
    { status: "review" },
    { status: "review", id: "bad", level: 0, type: "concept" },
    { status: "review", id: "BAS-0001", level: 9, type: "concept" },
    { status: "review", id: "BAS-0001", level: 0, type: "unknown" },
  ]) {
    assert.throws(() => parseArticle(fixture(overrides), "status.md"), /記事 status\.md:/);
  }

  const directory = mkdtempSync(path.join(os.tmpdir(), "aiportal-status-"));
  try {
    writeFileSync(path.join(directory, "published.md"), fixture({ slug: "published" }));
    writeFileSync(path.join(directory, "review.md"), fixture({
      slug: "review", id: "BAS-0001", level: 0, type: "concept", status: "review",
    }));
    assert.equal(readAllArticles(directory).length, 2);
    assert.deepEqual(readArticles(directory).map((article) => article.slug), ["published"]);
  } finally {
    for (const filename of readdirSync(directory)) unlinkSync(path.join(directory, filename));
    rmdirSync(directory);
  }
});

test("scheduled記事はpublishAtを要求し、自動では公開しない", () => {
  assert.throws(() => parseArticle(fixture({
    id: "BAS-0001", level: 0, type: "concept", status: "scheduled",
  }), "scheduled.md"), /publishAt/);
  const article = parseArticle(fixture({
    id: "BAS-0001", level: 0, type: "concept", status: "scheduled",
    publishAt: "2026-10-10T08:00:00+09:00",
  }), "scheduled.md");
  assert.equal(article.publishAt, "2026-10-10T08:00:00+09:00");
});

test("壊れたYAML、キー重複、空の本文、誤ったtags形式を拒否する", () => {
  assert.throws(() => parseArticle("本文のみ", "broken.md"), /frontmatter/);
  assert.throws(() => parseArticle("---\ntitle: [\n---\n本文", "broken.md"));
  assert.throws(() => parseArticle(fixture().replace("title:", "slug: other\ntitle:"), "duplicate.md"));
  assert.throws(() => parseArticle(fixture({}, ""), "empty.md"), /本文/);
  assert.throws(() => parseArticle(fixture({ tags: "AI" }), "tags.md"), /tags/);
});

test("ファイル追加だけで記事と新カテゴリーを取り込み、公開日順に並べる", () => {
  const directory = mkdtempSync(path.join(os.tmpdir(), "aiportal-articles-"));
  try {
    writeFileSync(path.join(directory, "older.md"), fixture({ slug: "older", publishedAt: "2026-09-01" }));
    writeFileSync(path.join(directory, "ignored.txt"), "記事ではないファイル");
    assert.equal(readArticles(directory).length, 1);
    writeFileSync(path.join(directory, "newer.md"), fixture({ slug: "newer", category: "生成AI" }));
    const articles = readArticles(directory);
    assert.deepEqual(articles.map((article) => article.slug), ["newer", "older"]);
    assert.deepEqual(getCategories(articles), [
      "最新",
      "AIニュース",
      "AI基礎・技術",
      "生成AI",
      "AIエージェント",
      "フィジカルAI・ロボティクス",
      "AI開発・インフラ",
      "AI活用・社会",
    ]);
    writeFileSync(path.join(directory, "duplicate.md"), fixture({ slug: "newer" }));
    assert.throws(() => readArticles(directory), /重複/);
  } finally {
    for (const filename of readdirSync(directory)) unlinkSync(path.join(directory, filename));
    rmdirSync(directory);
  }
});

test("リポジトリ内の全記事が有効なfrontmatterと本文を持つ", () => {
  const articles = readArticles(path.join(process.cwd(), "content/articles"));
  assert.ok(articles.length > 0);
  assert.equal(new Set(articles.map((article) => article.slug)).size, articles.length);
});
