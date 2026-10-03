import type { ArticleMetadata } from "../types/article";

export function getRelatedArticles(article: ArticleMetadata, articles: ArticleMetadata[], limit = 3): ArticleMetadata[] {
  return articles.filter((candidate) => candidate.slug !== article.slug).map((candidate) => ({
    article: candidate,
    score: (candidate.category === article.category ? 2 : 0) +
      candidate.tags.filter((tag) => article.tags.includes(tag)).length,
  })).filter(({ score }) => score > 0).sort((a, b) => b.score - a.score ||
    b.article.publishedAt.localeCompare(a.article.publishedAt) || a.article.slug.localeCompare(b.article.slug))
    .slice(0, limit).map(({ article: related }) => related);
}
