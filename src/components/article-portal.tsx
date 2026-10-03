"use client";

import React, { useState, type ReactNode } from "react";

import Link from "next/link";
import type { ArticleMetadata } from "@/types/article";
import { formatArticleDate } from "@/lib/dates";

// ランキングデータ
const ranking = [
  "Claude Code のインストール方法",
  "GPT-5 発売時期予想",
  "画像生成AI 著作権ガイドライン",
  "Gemini vs ChatGPT 性能比較",
  "AIエージェントによる自動化事例",
];

// キーワードデータ
const keywords = ["LLM", "RAG", "エージェント", "GPU", "NVIDIA", "Python", "TypeScript", "プロンプト"];

type Props = { articles: ArticleMetadata[]; categories: string[]; today: string; sidebarSlot?: ReactNode };

export default function ArticlePortal({ articles, categories, today, sidebarSlot }: Props) {
  const [activeTab, setActiveTab] = useState("最新");
  const [visibleCount, setVisibleCount] = useState(20);

  const filteredArticles = activeTab === "最新"
    ? articles
    : articles.filter(a => a.category === activeTab);

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      {/* Header / Navigation */}
      <header className="border-b border-gray-200 sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-2xl font-black tracking-tighter text-blue-700">AI PORTAL</h1>
            <div className="hidden md:flex items-center space-x-4 text-xs font-bold">
              <span className="text-gray-500">{formatArticleDate(today)}</span>
            </div>
          </div>
          <nav className="flex overflow-x-auto no-scrollbar border-t border-gray-100 py-2">
            {categories.map((cat) => (
              <button
                key={cat}
                aria-pressed={activeTab === cat}
                onClick={() => { setActiveTab(cat); setVisibleCount(20); }}
                className={`flex-shrink-0 px-4 py-1 text-sm font-bold transition-colors ${
                  activeTab === cat
                    ? "text-blue-600 bg-blue-50 rounded"
                    : "text-gray-700 hover:text-blue-600"
                }`}
              >
                {cat}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Main Article List (Left) */}
          <div className="lg:w-2/3">
            <div className="flex items-center justify-between mb-4 border-b-2 border-gray-900 pb-1">
              <h2 className="text-lg font-black">{activeTab}ニュース</h2>
              <span className="text-xs text-gray-500">件数: {filteredArticles.length}件</span>
            </div>

            <div className="space-y-4">
              {filteredArticles.slice(0, visibleCount).map((article) => (
                <article key={article.slug} className="flex gap-4 pb-4 border-b border-gray-100 group cursor-pointer">
                  <Link href={`/articles/${article.slug}`} aria-label={article.title} className="w-24 h-18 sm:w-32 sm:h-24 flex-shrink-0 bg-gray-100 overflow-hidden rounded">
                    {/* eslint-disable-next-line @next/next/no-img-element -- Keep the existing remote thumbnails without a host allowlist. */}
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
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded uppercase">
                        {article.category}
                      </span>
                      {(Date.parse(today) - Date.parse(article.publishedAt) >= 0 && Date.parse(today) - Date.parse(article.publishedAt) < 7 * 86400000) && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-500 text-white rounded uppercase italic">
                          New
                        </span>
                      )}
                      <time dateTime={article.publishedAt} className="text-xs text-gray-400">{formatArticleDate(article.publishedAt)}</time>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold leading-snug group-hover:text-blue-700 mb-1 line-clamp-2">
                      <Link href={`/articles/${article.slug}`}>{article.title}</Link>
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 leading-relaxed">
                      {article.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            {filteredArticles.length > visibleCount && (
              <button onClick={() => setVisibleCount((count) => count + 20)} className="w-full mt-6 py-3 border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 rounded transition-colors">
                もっと見る
              </button>
            )}
          </div>

          {/* Sidebar (Right) */}
          <aside className="lg:w-1/3 space-y-8">

            {/* Ranking Card */}
            <section className="bg-gray-50 p-4 rounded-lg">
              <h2 className="text-sm font-black border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-600 inline-block"></span>
                アクセスランキング
              </h2>
              <ol className="space-y-3">
                {ranking.map((item, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className={`text-lg font-black italic ${i < 3 ? 'text-blue-600' : 'text-gray-300'}`}>
                      {i + 1}
                    </span>
                    <a href="#" className="text-xs font-bold leading-tight hover:text-blue-700 hover:underline">
                      {item}
                    </a>
                  </li>
                ))}
              </ol>
            </section>

            {/* Keyword Card */}
            <section>
              <h2 className="text-sm font-black border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-600 inline-block"></span>
                注目のキーワード
              </h2>
              <div className="flex flex-wrap gap-2">
                {keywords.map((kw) => (
                  <a
                    key={kw}
                    href="#"
                    className="text-[11px] font-bold px-3 py-1 bg-white border border-gray-200 rounded-full hover:border-blue-500 hover:text-blue-600 transition-all"
                  >
                    #{kw}
                  </a>
                ))}
              </div>
            </section>

            {/* Recommended Tools */}
            <section>
              <h2 className="text-sm font-black border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 bg-blue-600 inline-block"></span>
                おすすめAIツール
              </h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="w-10 h-10 bg-black text-white flex items-center justify-center rounded text-sm font-bold">C</div>
                  <div>
                    <div className="text-xs font-bold">Claude 3.5 Sonnet</div>
                    <div className="text-[10px] text-gray-500">最も自然な日本語対話</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="w-10 h-10 bg-blue-600 text-white flex items-center justify-center rounded text-sm font-bold">G</div>
                  <div>
                    <div className="text-xs font-bold">Gemini Advanced</div>
                    <div className="text-[10px] text-gray-500">Googleの最強AIモデル</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded transition-colors cursor-pointer border border-transparent hover:border-gray-100">
                  <div className="w-10 h-10 bg-green-600 text-white flex items-center justify-center rounded text-sm font-bold">P</div>
                  <div>
                    <div className="text-xs font-bold">Perplexity AI</div>
                    <div className="text-[10px] text-gray-500">爆速リサーチエンジン</div>
                  </div>
                </div>
              </div>
            </section>

            {sidebarSlot}

          </aside>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 mt-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-gray-800 pb-8 mb-8">
            <h2 className="text-xl font-black text-white tracking-tighter">AI PORTAL</h2>
            <nav className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-bold">
              <a href="#" className="hover:text-white">運営会社</a>
              <a href="#" className="hover:text-white">プライバシーポリシー</a>
              <a href="#" className="hover:text-white">利用規約</a>
              <a href="#" className="hover:text-white">広告掲載について</a>
              <a href="#" className="hover:text-white">お問い合わせ</a>
            </nav>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] font-bold tracking-widest uppercase">
            <span>© 2026 AI PORTAL. All rights reserved.</span>
            <div className="flex gap-4">
              <span>Twitter</span>
              <span>Facebook</span>
              <span>RSS</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Style overrides for high density */}
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
