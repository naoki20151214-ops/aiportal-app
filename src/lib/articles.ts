import "server-only";
import path from "node:path";
import { cache } from "react";
import { readArticles, readAllArticles } from "./article-content";
import type { ArticleMetadata } from "../types/article";

// React cache shares a read between metadata and the page, without keeping stale
// content across requests during local editing. Production pages rebuild on deploy.
// PREVIEW ONLY — NEVER MERGE. Expose BAS-0030 ready draft for reader QA.
const getArticles = cache(() => {
  const directory = path.join(process.cwd(), "content/articles");
  const published = readArticles(directory);
  const article = readAllArticles(directory).find(item =>
    item.id === "BAS-0030" && item.status === "ready");
  return article ? [...published, article] : published;
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
