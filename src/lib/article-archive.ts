import type { ArticleMetadata } from "../types/article";

export type ArchiveSort = "newest" | "oldest";
export type ArchiveFilters = {
  keyword: string;
  category: string;
  level: string;
  sort: ArchiveSort;
};

// Client-side filtering only receives published article metadata.
// Keep a second explicit status guard so ready/scheduled drafts never leak.
export function filterArticleArchive(articles: ArticleMetadata[], filters: ArchiveFilters): ArticleMetadata[] {
  const query = filters.keyword.normalize("NFKC").trim().toLocaleLowerCase("ja-JP");
  return articles
    .filter((article) => {
      if (article.status !== "published") return false;
      if (filters.category !== "すべて" && article.category !== filters.category) return false;
      if (filters.level !== "all" && article.level !== Number(filters.level)) return false;
      if (!query) return true;
      const searchable = [
        article.title, article.description, article.category, ...article.tags,
      ].join(" ").normalize("NFKC").toLocaleLowerCase("ja-JP");
      return searchable.includes(query);
    })
    .sort((a, b) => {
      const dateCompare = a.publishedAt.localeCompare(b.publishedAt);
      if (dateCompare !== 0) return filters.sort === "oldest" ? dateCompare : -dateCompare;
      return a.slug.localeCompare(b.slug);
    });
}
