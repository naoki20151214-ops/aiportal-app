import type { MetadataRoute } from "next";
import { getAllArticles } from "@/lib/articles";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

const staticPages = ["/about", "/privacy", "/terms", "/advertising", "/contact"];

export default function sitemap(): MetadataRoute.Sitemap {
  const articles = getAllArticles();
  const lastUpdated = articles.map((article) => article.updatedAt).sort().at(-1);
  return [
    { url: absoluteUrl("/"), ...(lastUpdated ? { lastModified: lastUpdated } : {}) },
    ...staticPages.map((path) => ({
      url: absoluteUrl(path),
      lastModified: "2026-10-03",
    })),
    ...articles.map((article) => ({
      url: absoluteUrl(`/articles/${article.slug}`), lastModified: article.updatedAt,
    })),
  ];
}
