import type { Metadata } from "next";
import Link from "next/link";
import { getAllArticles } from "@/lib/articles";
import { newsLearningLinks } from "@/lib/news-learning-links";
import { formatArticleDate } from "@/lib/dates";
import { absoluteUrl } from "@/lib/site";
import SiteFooter from "@/components/site-footer";

export const metadata: Metadata = {
  title: "AIニュース｜世界のAI発表を理解する",
  description: "AIの公式発表と研究を追い、学習記事で背景を理解するAI Portalのニュース入口。自動ニュース配信は準備中です。",
  alternates: { canonical: absoluteUrl("/news") },
  openGraph: {
    type: "website",
    title: "AIニュース｜AI Portal",
    description: "公開済みのAIニュースと、理解を深める基礎知識をまとめています。",
    url: absoluteUrl("/news"),
    locale: "ja_JP",
  },
};

export default function NewsIndexPage() {
  // getAllArticles is backed by readArticles: excludes all ready and draft content.
  const published = getAllArticles();
  const news = published.filter(a=>a.category==="AIニュース" || a.type==="news")
    .sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt));
  return (
    <div className="min-h-screen bg-white text-gray-900">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-xl font-black text-blue-700 sm:text-2xl">AI PORTAL</Link>
          <nav aria-label="サイト内の移動" className="flex gap-4 text-sm font-bold">
            <Link href="/" className="text-blue-700 hover:underline">トップ</Link>
            <Link href="/articles" className="text-gray-600 hover:text-blue-700">学習記事</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:py-12">
        <div className="max-w-3xl">
          <p className="text-xs font-bold tracking-wide text-blue-700">AI PORTAL NEWS</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">AIニュース</h1>
          <p className="mt-4 text-base leading-8 text-gray-700">
            世界のAIの動きを、ただ知るだけでなく理解するための入口です。
            最新の発表を読むときに役立つ学習記事も一緒に案内します。
          </p>
        </div>
        <section aria-label="ニュース配信の準備状況" className="mt-7 max-w-3xl rounded-2xl border border-sky-200 bg-sky-50 p-5">
          <p className="text-sm font-bold text-blue-800">毎朝のAIニュースは準備中です</p>
          <p className="mt-2 text-sm leading-7 text-gray-700">
            公式情報の収集・重複チェックを検証しています。取得しただけの情報はニュースとして公開しません。
            日々の自動配信は、一次資料と編集品質を確認できる仕組みが完成してから始めます。
          </p>
        </section>
        <section aria-labelledby="news-archive" className="mt-12">
          <div className="border-b-2 border-gray-900 pb-3">
            <h2 id="news-archive" className="text-xl font-black">これまでに公開したAIニュース</h2>
            <p className="mt-1 text-sm text-gray-600">公開済み {news.length} 本｜候補情報や予約記事は表示していません</p>
          </div>
          {news.length === 0 ? (
            <p className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-6 text-gray-700">
              公開済みのニュース記事はまだありません。
            </p>
          ) : (
            <div className="mt-6 grid gap-5 md:grid-cols-2">
              {news.map(item=>(
                <article key={item.slug} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <time className="text-xs text-gray-500" dateTime={item.publishedAt}>
                    {formatArticleDate(item.publishedAt)}
                  </time>
                  <h3 className="mt-3 text-lg font-black leading-snug">
                    <Link href={"/articles/"+item.slug} className="text-gray-900 hover:text-blue-700 hover:underline">
                      {item.title}
                    </Link>
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-gray-600">{item.description}</p>
                  <Link className="mt-4 inline-block text-sm font-bold text-blue-700 hover:underline" href={"/articles/"+item.slug}>
                    記事を読む →
                  </Link>
                  <div className="mt-5 border-t border-gray-100 pt-4">
                    <p className="text-xs font-bold text-gray-700">理解を深める基礎知識</p>
                    <ul className="mt-2 space-y-2">
                      {newsLearningLinks(item,published).map(target=>(
                        <li key={target.slug}>
                          <Link href={"/articles/"+target.slug} className="text-sm text-blue-700 hover:underline">
                            {target.title} →
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
        <section aria-label="ニュース編集方針" className="mt-12 rounded-2xl bg-gray-50 p-6">
          <h2 className="font-black">編集方針</h2>
          <p className="mt-2 text-sm leading-7 text-gray-700">
            企業の公式発表や研究者の一次資料を優先します。発表日と利用条件を確認し、
            未検証の情報は事実として掲載しません。研究論文は査読状況を区別します。
            ニュースと広告・PRは分離します。
          </p>
          <Link href="/advertising" className="mt-3 inline-block text-sm font-bold text-blue-700 hover:underline">
            広告掲載ポリシーを見る →
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
