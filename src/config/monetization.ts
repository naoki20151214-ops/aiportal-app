import type { AdPosition, AffiliateCampaign, ArticleAdRules, DisplayAdUnit } from "../types/monetization";

// No live tags, publisher IDs, tracking pixels, or affiliate URLs are configured.
export const monetizationConfig: {
  displayAds: Partial<Record<AdPosition, DisplayAdUnit>>;
  affiliateCampaigns: AffiliateCampaign[];
  articleRules: ArticleAdRules;
  disclosure: { policyUrl?: string };
} = {
  displayAds: {},
  affiliateCampaigns: [],
  articleRules: {
    endMinCharacters: 800,
    introMinCharacters: 1400,
    middleMinCharacters: 2800,
    minSeparationCharacters: 700,
  },
  disclosure: { policyUrl: "/advertising" },
};
