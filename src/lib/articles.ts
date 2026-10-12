import "server-only";
import path from "node:path";
import { cache } from "react";
import { readAllArticles, readArticles } from "./article-content";
import type { ArticleMetadata } from "../types/article";

// React cache shares a read between metadata and the page, without keeping stale
// content across requests during local editing. Production pages rebuild on deploy.
// PREVIEW ONLY. NEVER MERGE: expose only the approved BAS-0017 ready article
// for Cloudflare visual QA. The production readArticles() publication gate stays intact.
const getArticles = cache(() => {
  const directory = path.join(process.cwd(), "content/articles");
  const published = readArticles(directory);
  const previewArticle = readAllArticles(directory).find((article) =>
    article.id === "BAS-0017" && article.status === "ready",
  );
  return previewArticle ? [...published, previewArticle] : published;
});

export function getAllArticles(): ArticleMetadata[] {
  return getArticles().map(({ content, ...metadata }) => {
    void content;
    return metadata;
  });
}

export function getArticleBySlug(slug: string) {
  return getArticles().find((article) => article.slug === slug);
}
