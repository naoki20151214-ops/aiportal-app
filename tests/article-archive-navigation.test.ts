import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { filterArticleArchive } from "../src/lib/article-archive";
import { readArticles } from "../src/lib/article-content";
import type { ArticleMetadata } from "../src/types/article";

const sample = (slug: string, props: Partial<ArticleMetadata> = {}): ArticleMetadata => ({
  id: "GEN-0008",
  title: slug,
  slug,
  description: "AI学習の説明",
  category: "生成AI",
  level: 2,
  type: "concept",
  status: "published",
  publishedAt: "2026-10-10",
  updatedAt: "2026-10-10",
  author: "AI Portal編集部",
  thumbnail: "/images/article-placeholder.svg",
  tags: ["学習"],
  ...props,
});
const all = [
  sample("rag", { title: "RAGとは？", publishedAt: "2026-10-12", tags: ["RAG", "検索"] }),
  sample("vector", { title: "ベクトル入門", publishedAt: "2026-10-11", category: "AI基礎・技術", level: 1, tags: ["ベクトル"] }),
  sample("attention", { title: "Attentionとは？", publishedAt: "2026-10-13", category: "AI基礎・技術", level: 2 }),
  sample("private-ready", { title: "未公開記事", status: "ready", publishedAt: "2026-10-14" }),
  sample("private-scheduled", { title: "予約中記事", status: "scheduled", publishedAt: "2026-10-14" }),
  sample("private-review", { title: "編集中記事", status: "review", publishedAt: "2026-10-14" }),
];
const defaults = { keyword: "", category: "すべて", level: "all", sort: "newest" as const };

test("article archive never exposes non-published drafts, including scheduled", () => {
  assert.deepEqual(filterArticleArchive(all, defaults).map(x => x.slug), ["attention", "rag", "vector"]);
});

test("article archive filters by title, description, tag, category and difficulty", () => {
  assert.deepEqual(filterArticleArchive(all, { ...defaults, keyword: "  ｒａｇ " }).map(x => x.slug), ["rag"]);
  assert.deepEqual(filterArticleArchive(all, { ...defaults, keyword: "検索" }).map(x => x.slug), ["rag"]);
  assert.deepEqual(filterArticleArchive(all, { ...defaults, keyword: "学習" }).map(x => x.slug), ["attention", "rag", "vector"]);
  assert.deepEqual(filterArticleArchive(all, { ...defaults, category: "AI基礎・技術", level: "1" }).map(x => x.slug), ["vector"]);
  assert.deepEqual(filterArticleArchive(all, { ...defaults, category: "AI基礎・技術", level: "0" }), []);
});

test("article archive supports oldest-first and stable same-date ordering", () => {
  assert.deepEqual(filterArticleArchive(all, { ...defaults, sort: "oldest" }).map(x => x.slug), ["vector", "rag", "attention"]);
  const ties = [sample("z"), sample("a")];
  assert.deepEqual(filterArticleArchive(ties, defaults).map(x => x.slug), ["a", "z"]);
});

test("published archive is reachable from top, articles and footer, and indexed in sitemap", () => {
  const root = process.cwd();
  const home = readFileSync(path.join(root, "src/components/article-portal.tsx"), "utf8");
  const archivePage = readFileSync(path.join(root, "src/app/articles/page.tsx"), "utf8");
  const detail = readFileSync(path.join(root, "src/app/articles/[slug]/page.tsx"), "utf8");
  const footer = readFileSync(path.join(root, "src/components/site-footer.tsx"), "utf8");
  const sitemap = readFileSync(path.join(root, "src/app/sitemap.ts"), "utf8");
  assert.match(home, /過去の記事から探す/);
  assert.match(home, /href="\/articles"/);
  assert.match(home, /encodeURIComponent\(name\)/);
  assert.ok(home.indexOf("最新記事") < home.indexOf('aria-labelledby="archive-guide-title"'), "Latest articles must appear before archive card");
  assert.match(archivePage, /getAllArticles\(\)/);
  assert.match(archivePage, /<ArticleArchive articles=\{articles\}/);
  assert.match(detail, /href="\/articles"/);
  assert.match(footer, /href: "\/articles"/);
  assert.match(sitemap, /absoluteUrl\("\/articles"\)/);
});

test("archive source is exactly the set of actually published article metadata", () => {
  const articles = readArticles(path.join(process.cwd(), "content/articles"));
  assert.ok(articles.length >= 48);
  assert.ok(articles.every(article => article.status === "published"));
  const result = filterArticleArchive(articles, defaults);
  assert.equal(result.length, articles.length);
  assert.equal(new Set(result.map(article => article.slug)).size, result.length);
});
