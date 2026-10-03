import { monetizationConfig } from "@/config/monetization";
import { getMonetizationFlags, selectAffiliateCampaign } from "@/lib/monetization";
import type { ArticleMetadata } from "@/types/article";
import type { AffiliatePosition } from "@/types/monetization";
import AffiliateCard from "./affiliate-card";

export default function AffiliateSlot({ article, position }: { article: ArticleMetadata; position: AffiliatePosition }) {
  if (!getMonetizationFlags().affiliatesEnabled) return null;
  const campaign = selectAffiliateCampaign(article, monetizationConfig.affiliateCampaigns, position);
  return campaign ? <AffiliateCard campaign={campaign} /> : null;
}
