"use client";

import React, { useState, type ReactNode } from "react";
import Link from "next/link";
import SiteFooter from "@/components/site-footer";
import type { ArticleMetadata } from "@/types/article";
import { formatArticleDate } from "@/lib/dates";

type Props = { articles: ArticleMetadata[]; categories: string[]; today: string; sidebarSlot?: ReactNode };

export default function ArticlePortal({ articles, categories, today, sidebarSlot }: Props) {
  const [activeTab, setActiveTab] = useState("最新");
  const [visibleCount, setVisibleCount] = useState(20);

  const filteredArticles = activeTab === "最新"
    ? articles
    : articles.filter((article) => article.category === activeTab);
  const featuredArticles = articles.slice(0, 5);
  const keywords = Array.from(new Set(articles.flatMap((article) => article.tags))).slice(0, 10);
  const categoryCounts = categories.filter((cat) => cat !== "最新")
    .map((name) => ({ name, count: articles.filter((article) => article.category === name).length }))
    .filter((item) => item.count > 0);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <header className="border-b border-gray-200 sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <Link href="/" className="text-2xl font-black tracking-tighter text-blue-700">AI PORTAL</Link>
            <div className="flex items-center gap-4 text-sm font-bold">
              <Link href="/articles" className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-blue-700 hover:bg-blue-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
                記事一覧 <span aria-hidden="true">→</span>
              </Link>
              <span className="hidden md:inline text-xs text-gray-500">{formatArticleDate(today)}</span>
            </div>
          </div>
          <nav className="flex overflow-x-auto no-scrollbar border-t border-gray-100 py-2">
            {categories.map((cat) => (
              <button
                key={cat}
                aria-pressed={activeTab === cat}
                onClick={() => { setActiveTab(cat); setVisibleCount(20); }}
                className={`flex-shrink-0 px-4 py-1 text-sm font-bold transition-colors ${
                  activeTab === cat ? "text-blue-600 bg-blue-50 rounded" : "text-gray-700 hover:text-blue-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <section aria-labelledby="archive-guide-title" className="mb-8 rounded-2xl border border-blue-100 bg-blue-50/70 p-5 sm:p-7">
          <p className="text-sm font-bold text-blue-700">AIを学ぶ記事を探す</p>
          <div className="mt-2 flex flex-col items-start gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 id="archive-guide-title" className="text-2xl sm:text-3xl font-black leading-snug">
                これまでの記事を、まとめて探せます
              </h1>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-gray-700">
                公開済みの{articles.length}記事から、知りたいテーマを検索。カテゴリや難易度でも選べます。
              </p>
            </div>
            <Link
              href="/articles"
              className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-700 px-5 py-3.5 text-base font-bold text-white shadow-sm hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 md:w-auto"
            >
              すべての記事を見る <span aria-hidden="true">→</span>
            </Link>
          </div>
          {categoryCounts.length > 0 && (
            <div className="mt-6 border-t border-blue-100 pt-5">
              <h2 className="mb-3 text-sm font-bold text-gray-800">カテゴリから探す</h2>
              <div className="flex flex-wrap gap-2">
                {categoryCounts.map(({ name, count }) => (
                  <Link
                    key={name}
                    href={`/articles?category=${encodeURIComponent(name)}`}
                    className="rounded-full border border-blue-100 bg-white px-3.5 py-2 text-sm font-bold text-blue-800 hover:border-blue-400 hover:bg-blue-100"
                  >
                    {name} <span className="text-gray-500">({count})</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="lg:w-2/3">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-900 pb-1">
              <h2 className="text-lg font-black">{activeTab === "最新" ? "最新記事" : `${activeTab}の記事`}</h2>
              <span className="text-xs text-gray-500">件数: {filteredArticles.length}件</span>
            </div>

            <div className="space-y-4">
              {filteredArticles.slice(0, visibleCount).map((article) => (
                <article key={article.slug} className="flex gap-4 pb-4 border-b border-gray-100 group">
                  <Link href={`/articles/${article.slug}`} aria-label={article.title} className="w-24 h-18 sm:w-32 sm:h-24 flex-shrink-0 bg-gray-100 overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Keep remote thumbnails without a host allowlist. */}
                    <img
                      loading="lazy"
                      src={article.thumbnail}
                      onError={(event) => {
                        const fallback = "/images/article-placeholder.svg";
                        if (event.currentTarget.getAttribute("src") !== fallback) event.currentTarget.src = fallback;
                      }}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </Link>
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded uppercase">{article.category}</span>
                      {(Date.parse(today) - Date.parse(article.publishedAt) >= 0 && Date.parse(today) - Date.parse(article.publishedAt) < 7 * 86400000) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-500 text-white rounded uppercase italic">New</span>
                      )}
                      <time dateTime={article.publishedAt} className="text-xs text-gray-400">{formatArticleDate(article.publishedAt)}</time>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold leading-snug group-hover:text-blue-700 mb-1 line-clamp-2">
                      <Link href={`/articles/${article.slug}`}>{article.title}</Link>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 leading-relaxed">{article.description}</p>
                  </div>
                </article>
              ))}
            </div>

            {filteredArticles.length > visibleCount && (
              <button onClick={() => setVisibleCount((count) => count + 20)} className="w-full mt-6 py-3 border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded transition-colors">
                もっと見る
              </button>
            )}
            <Link href="/articles" className="mt-5 block rounded-lg border border-blue-200 px-5 py-3 text-center text-sm font-bold text-blue-700 hover:bg-blue-50">
              過去の記事も含めた全{articles.length}記事の一覧を見る →
            </Link>
          </div>

          <aside className="lg:w-1/3 space-y-8">
            <section className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-sm font-black border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-600 inline-block"></span>
                おすすめ記事
              </h2>
              <ol className="space-y-3">
                {featuredArticles.map((article, index) => (
                  <li key={article.slug} className="flex items-start gap-3">
                    <span className={`text-lg font-black italic ${index < 3 ? "text-blue-600" : "text-gray-300"}`}>{index + 1}</span>
                    <Link href={`/articles/${article.slug}`} className="text-xs font-bold leading-tight hover:text-blue-700 hover:underline">
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ol>
            </section>

            {keywords.length > 0 && (
              <section>
                <h2 className="text-sm font-black border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                  <span className="w-1.5 h-4 bg-blue-600 inline-block"></span>
                  注目のキーワード
                </h2>
                <div className="flex flex-wrap gap-2">
                  {keywords.map((keyword) => (
                    <span key={keyword} className="text-[11px] font-bold px-3 py-1 bg-white border border-gray-200 rounded-full text-gray-600">
                      #{keyword}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {sidebarSlot}
          </aside>
        </div>
      </main>

      <SiteFooter />

      <style jsx global>{`
        body {
          background-color: #fff !important;
          color: #1a1a1a !important;
        }
        a {
          color: inherit;
          text-decoration: none;
        }
        a:hover {
          color: #2563eb;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
