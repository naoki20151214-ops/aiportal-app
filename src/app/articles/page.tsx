import type { Metadata } from "next";
import Link from "next/link";
import ArticleArchive from "@/components/article-archive";
import SiteFooter from "@/components/site-footer";
import { getAllArticles } from "@/lib/articles";
import { absoluteUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "記事一覧｜これまでのAI学習記事を探す",
  description: "AI Portalの公開済み記事を一覧で探せます。タイトル検索、カテゴリ・難易度別の絞り込み、新しい順・古い順の並び替えに対応。",
  alternates: { canonical: absoluteUrl("/articles") },
  openGraph: {
    type: "website",
    title: "記事一覧｜AI Portal",
    description: "AIの基礎から応用まで、公開済みの学習記事を一覧で探す。",
    url: absoluteUrl("/articles"),
    locale: "ja_JP",
  },
};

export default function AllArticlesPage() {
  // getAllArticles is backed by readArticles, which selects only published.
  const articles = getAllArticles();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <Link href="/" className="text-xl sm:text-2xl font-black tracking-tighter text-blue-700">AI PORTAL</Link>
          <nav aria-label="記事一覧ページのナビゲーション" className="flex items-center gap-4 text-sm font-bold">
            <Link href="/" className="text-gray-600 hover:text-blue-700">トップへ戻る</Link>
            <span aria-current="page" className="text-blue-700">記事一覧</span>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-8 sm:py-12">
        <nav aria-label="パンくずリスト" className="mb-5 text-sm text-gray-500">
          <Link href="/" className="hover:text-blue-700 hover:underline">トップ</Link>
          <span aria-hidden="true" className="mx-2">›</span>
          <span aria-current="page">記事一覧</span>
        </nav>
        <div className="mb-8">
          <p className="text-sm font-bold text-blue-700 mb-2">学びの記事を探す</p>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">公開済みの記事一覧</h1>
          <p className="text-gray-600 leading-relaxed mt-3">
            これまでに公開した{articles.length}記事をまとめました。気になる言葉を検索したり、カテゴリ・難易度から選んだりできます。
          </p>
        </div>
        <ArticleArchive articles={articles} />
      </main>
      <SiteFooter />
    </div>
  );
}
