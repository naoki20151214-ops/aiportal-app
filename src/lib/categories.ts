import type { ArticleMetadata } from "../types/article";

export const contentCategories = [
  "AIニュース",
  "AI基礎・技術",
  "生成AI",
  "AIエージェント",
  "フィジカルAI・ロボティクス",
  "AI開発・インフラ",
  "AI活用・社会",
] as const;

export type ContentCategory = (typeof contentCategories)[number];

export function isContentCategory(value: string): value is ContentCategory {
  return (contentCategories as readonly string[]).includes(value);
}

export function getCategories(_articles: ArticleMetadata[]): string[] {
  return ["最新", ...contentCategories];
}
