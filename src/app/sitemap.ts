import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/articles";
import { absoluteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles();
  const lastUpdated = articles.map((article) => article.updatedAt).sort().at(-1);
  return [
    { url: absoluteUrl("/"), ...(lastUpdated ? { lastModified: lastUpdated } : {}) },
    ...articles.map((article) => ({
      url: absoluteUrl(`/articles/${article.slug}`), lastModified: article.updatedAt,
    })),
  ];
}
