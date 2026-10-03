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
  affiliateCampaign?: string;
  adPolicy?: "auto" | "reduced" | "off";
};

export type Article = ArticleMetadata & { content: string };
