export type ArticleStatus = "draft" | "review" | "ready" | "scheduled" | "published";
export type ArticleType = "concept" | "mechanism" | "practice" | "comparison" | "news" | "reference";

export type ArticleMetadata = {
  title: string;
  slug: string;
  description: string;
  category: string;
  publishedAt: string;
  updatedAt: string;
  author: string;
  thumbnail: string;
  tags: string[];
  status?: ArticleStatus;
  id?: string;
  level?: number;
  type?: ArticleType;
  publishAt?: string;
  affiliateCampaign?: string;
  adPolicy?: "auto" | "reduced" | "off";
};

export type Article = ArticleMetadata & { content: string };
