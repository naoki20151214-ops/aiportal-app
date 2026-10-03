export type AdPosition = "article-after-intro" | "article-middle" | "article-end" | "sidebar";
export type DisplayAdType = "banner" | "rectangle";
export type DisplayAdProvider = "custom" | "adsense";

export type DisplayAdUnit = {
  id: string;
  enabled: boolean;
  type: DisplayAdType;
  provider: DisplayAdProvider;
  // The provider must fit inside this server-rendered size, including on mobile.
  width: number;
  height: number;
};

export type AffiliatePosition = "article-end" | "sidebar";
export type AffiliateCampaign = {
  id: string;
  enabled: boolean;
  provider: "a8" | "other";
  title: string;
  description: string;
  href: string;
  cta: string;
  positions: AffiliatePosition[];
  categories?: string[];
  tags?: string[];
  priority?: number;
};

export type ArticleAdRules = {
  endMinCharacters: number;
  introMinCharacters: number;
  middleMinCharacters: number;
  minSeparationCharacters: number;
};
