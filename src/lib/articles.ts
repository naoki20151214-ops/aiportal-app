import "server-only";
import path from "node:path";
import { cache } from "react";
import { readArticles } from "./article-content";
import type { ArticleMetadata } from "../types/article";

// React cache shares a read between metadata and the page, without keeping stale
// content across requests during local editing. Production pages rebuild on deploy.
const getArticles = cache(() => readArticles(path.join(process.cwd(), "content/articles")));

export function getAllArticles(): ArticleMetadata[] {
  return getArticles().map(({ content, ...metadata }) => {
    void content;
    return metadata;
  });
}

export function getArticleBySlug(slug: string) {
  return getArticles().find((article) => article.slug === slug);
}
