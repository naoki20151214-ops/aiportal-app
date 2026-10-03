import type { ArticleMetadata } from "../types/article";

const originalCategories = [
  "最新", "AIエージェント", "Claude Code", "ChatGPT", "Gemini", "AI画像動画生成", "AIツール",
];

export function getCategories(articles: ArticleMetadata[]): string[] {
  return [...new Set([...originalCategories, ...articles.map((article) => article.category)])];
}
