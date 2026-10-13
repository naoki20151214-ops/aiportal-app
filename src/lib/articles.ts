import "server-only";
import path from "node:path";
import { cache } from "react";
import { readAllArticles, readArticles } from "./article-content";
import type { ArticleMetadata } from "../types/article";

// React cache shares a read between metadata and the page, without keeping stale
// content across requests during local editing. Production pages rebuild on deploy.
// PREVIEW ONLY — NEVER MERGE. Show exactly BAS-0023 as ready without publishing.
const getArticles = cache(() => {
  const directory = path.join(process.cwd(), "content/articles");
  const published = readArticles(directory);
  const preview = readAllArticles(directory).find(article =>
    article.id === "BAS-0023" && article.status === "ready");
  return preview ? [...published, preview] : published;
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
