import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import path from "node:path";
import ArticleBody from "@/components/article-body";
import ArticleDifficulty from "@/components/article-difficulty";
import { readAllArticles } from "@/lib/article-content";

export const metadata: Metadata = {
  title: "プレビュー専用｜Image-to-Videoとは？",
  robots: { index: false, follow: false, nocache: true },
};

export default function ImageToVideoReaderPreview() {
  // BRANCH-LOCAL REVIEW ONLY. This route must never enter main.
  // Directly read the SHA-approved ready manuscript without changing its status.
  const article = readAllArticles(path.join(process.cwd(), "content/articles"))
    .find(item => item.id === "GEN-0074" && item.slug === "image-to-video");
  if (!article) notFound();
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-3xl mx-auto px-4 py-5 flex flex-wrap items-center justify-between gap-3">
          <Link href="/" className="text-xl font-black text-blue-700">AI PORTAL</Link>
          <span className="rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900">
            閲覧専用プレビュー・未公開記事
          </span>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <p className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
          本ページはGEN-0074の読者確認用です。公開済みではありません。
          予約台帳への登録と本番公開は行っておらず、このプレビューページ自体をmainへマージしません。
        </p>
        <article>
          <header className="mb-8 border-b border-gray-200 pb-6">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-700">
              <span>{article.category}</span>
              <ArticleDifficulty level={article.level} />
            </div>
            <h1 className="mb-4 mt-5 text-2xl font-black leading-snug sm:text-3xl">{article.title}</h1>
            <p className="text-base leading-8 text-gray-600">{article.description}</p>
          </header>
          <ArticleBody content={article.content} />
        </article>
        <div className="mt-10 border-t border-gray-200 pt-6 text-sm text-gray-500">
          原稿の確認はここまでです。通常の公開記事一覧には表示されません。
        </div>
      </main>
    </div>
  );
}
