import Link from "next/link";
import type { ArticleMetadata } from "@/types/article";

export default function RelatedArticles({ articles }: { articles: ArticleMetadata[] }) {
  if (!articles.length) return null;
  return (
    <nav aria-label="関連記事" className="border-t border-gray-200 mt-10 pt-6">
      <h2 className="text-lg font-bold mb-4">関連記事</h2>
      <ul className="space-y-3">
        {articles.map((article) => (
          <li key={article.slug}>
            <Link href={`/articles/${article.slug}`} className="text-sm text-blue-700 hover:underline">{article.title}</Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
