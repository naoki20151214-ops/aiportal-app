"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import ArticleDifficulty from "@/components/article-difficulty";
import { contentCategories } from "@/lib/categories";
import { filterArticleArchive, type ArchiveSort } from "@/lib/article-archive";
import { formatArticleDate } from "@/lib/dates";
import type { ArticleMetadata } from "@/types/article";

const levels = ["入門", "基礎", "仕組み", "実践", "専門", "研究"] as const;

export default function ArticleArchive({ articles }: { articles: ArticleMetadata[] }) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("すべて");
  const [level, setLevel] = useState("all");
  const [sort, setSort] = useState<ArchiveSort>("newest");

  const published = useMemo(() => articles.filter((article) => article.status === "published"), [articles]);
  const categories = useMemo(
    () => contentCategories.map((name) => ({
      name, count: published.filter((article) => article.category === name).length,
    })).filter((item) => item.count > 0),
    [published],
  );

  // A top-page category shortcut lands directly in the matching filtered archive.
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get("category");
    if (fromUrl && categories.some((item) => item.name === fromUrl)) setCategory(fromUrl);
  }, [categories]);

  const results = useMemo(
    () => filterArticleArchive(published, { keyword, category, level, sort }),
    [published, keyword, category, level, sort],
  );
  const clearFilters = () => {
    setKeyword("");
    setCategory("すべて");
    setLevel("all");
    setSort("newest");
  };

  return (
    <div>
      <section aria-label="記事の絞り込み" className="rounded-2xl border border-gray-200 bg-gray-50 p-4 sm:p-6">
        <label htmlFor="archive-search" className="block font-bold text-sm text-gray-900 mb-2">
          記事をキーワードで探す
        </label>
        <input
          id="archive-search"
          type="search"
          autoComplete="off"
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          placeholder="例：RAG、AI、ベクトル、Attention"
          className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />

        <div className="mt-5">
          <h2 className="text-sm font-bold text-gray-900 mb-3">カテゴリから選ぶ</h2>
          <div className="flex flex-wrap gap-2">
            {[{ name: "すべて", count: published.length }, ...categories].map((item) => (
              <button
                type="button"
                key={item.name}
                aria-pressed={category === item.name}
                onClick={() => setCategory(item.name)}
                className={`rounded-full border px-3.5 py-2 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${category === item.name
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-gray-200 bg-white text-gray-700 hover:border-blue-300 hover:text-blue-700"}`}
              >
                {item.name} <span className="opacity-80">({item.count})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="archive-level" className="block text-sm font-bold mb-2">難易度で絞る</label>
            <select
              id="archive-level"
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base"
            >
              <option value="all">すべての難易度</option>
              {levels.map((label, index) => (
                <option value={String(index)} key={label}>{"★".repeat(index + 1)} {label}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="archive-sort" className="block text-sm font-bold mb-2">並び順</label>
            <select
              id="archive-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as ArchiveSort)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base"
            >
              <option value="newest">新しい記事から</option>
              <option value="oldest">古い記事から</option>
            </select>
          </div>
        </div>
      </section>

      <div className="mt-8 mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black" aria-live="polite">検索結果：{results.length}記事</h2>
        <button type="button" onClick={clearFilters} className="text-sm font-bold text-blue-700 underline underline-offset-4 hover:text-blue-900">
          条件をクリア
        </button>
      </div>

      {results.length === 0 ? (
        <div className="rounded-xl border border-gray-200 px-6 py-12 text-center">
          <p className="font-bold">条件に合う記事はありませんでした。</p>
          <p className="text-sm text-gray-600 mt-2">別の言葉やカテゴリでも探せます。</p>
          <button type="button" onClick={clearFilters} className="mt-4 rounded-lg bg-blue-700 px-5 py-2.5 text-white font-bold hover:bg-blue-800">すべての記事を見る</button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {results.map((article) => (
            <li key={article.slug} className="min-w-0">
              <article className="h-full rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-colors">
                <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                  <span className="rounded bg-blue-50 px-2 py-1 font-bold text-blue-700">{article.category}</span>
                  <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
                </div>
                <h3 className="mt-3 text-base sm:text-lg font-bold leading-relaxed">
                  <Link href={`/articles/${article.slug}`} className="text-gray-900 hover:text-blue-700 hover:underline underline-offset-4">{article.title}</Link>
                </h3>
                <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">{article.description}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <ArticleDifficulty level={article.level} />
                  <Link href={`/articles/${article.slug}`} className="text-sm font-bold text-blue-700 hover:underline" aria-label={`${article.title}を読む`}>記事を読む →</Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
