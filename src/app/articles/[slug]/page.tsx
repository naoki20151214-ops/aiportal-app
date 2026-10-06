import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ArticleBody from "@/components/article-body";
import ArticleDifficulty from "@/components/article-difficulty";
import RelatedArticles from "@/components/related-articles";
import SiteFooter from "@/components/site-footer";
import { getRelatedArticles } from "@/lib/related-articles";
import { getAllArticles, getArticleBySlug } from "@/lib/articles";
import { formatArticleDate } from "@/lib/dates";
import { absoluteUrl, siteName } from "@/lib/site";
import { getNextReadingMarkdown } from "@/lib/knowledge-registry";

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllArticles().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  const url = absoluteUrl(`/articles/${article.slug}`);
  const images = [{ url: absoluteUrl(article.thumbnail), alt: article.title }];
  return {
    title: article.title,
    description: article.description,
    authors: [{ name: article.author }],
    keywords: article.tags,
    alternates: { canonical: url },
    openGraph: {
      type: "article", title: article.title, description: article.description,
      url, siteName, locale: "ja_JP", images,
      publishedTime: `${article.publishedAt}T00:00:00+09:00`,
      modifiedTime: `${article.updatedAt}T00:00:00+09:00`,
      authors: [article.author], section: article.category, tags: article.tags,
    },
    twitter: {
      card: "summary_large_image", title: article.title,
      description: article.description, images,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();
  const nextReading = getNextReadingMarkdown(article.id);
  const articleContent = nextReading ? `${article.content}\n\n${nextReading}` : article.content;

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans">
      <header className="border-b border-gray-200 sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
          <Link href="/" className="text-2xl font-black tracking-tighter text-blue-700">AI PORTAL</Link>
          <Link href="/" className="text-xs font-bold text-gray-600 hover:text-blue-700">トップへ戻る</Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-8 sm:py-12">
        <article>
          <header className="border-b border-gray-200 pb-6 mb-8">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold px-2 py-1 bg-blue-50 text-blue-700 rounded">{article.category}</span>
              <ArticleDifficulty level={article.level} />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black leading-snug mt-4 mb-4">{article.title}</h1>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-gray-500">
              <span>公開日：<time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time></span>
              <span>更新日：<time dateTime={article.updatedAt}>{formatArticleDate(article.updatedAt)}</time></span>
              <span>著者：{article.author}</span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed mt-5">{article.description}</p>
          </header>
          <ArticleBody content={articleContent} article={article} />
          {article.tags.length > 0 && (
            <ul aria-label="記事のタグ" className="flex flex-wrap gap-2 mt-8">
              {article.tags.map((tag) => <li key={tag} className="text-xs px-3 py-1 border border-gray-200 rounded-full text-gray-600">#{tag}</li>)}
            </ul>
          )}
        </article>
        <RelatedArticles articles={getRelatedArticles(article, getAllArticles())} />
        <div className="border-t border-gray-200 mt-10 pt-6">
          <Link href="/" className="text-sm font-bold text-blue-700 hover:underline">← トップへ戻る</Link>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
