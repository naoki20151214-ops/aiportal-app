import type { ArticleMetadata } from "../types/article";
import type { AffiliateCampaign, AffiliatePosition, DisplayAdUnit } from "../types/monetization";

export function getMonetizationFlags(env: Record<string, string | undefined> = process.env) {
  const adsEnabled = env.ADS_ENABLED === "true";
  return { adsEnabled, affiliatesEnabled: adsEnabled && env.AFFILIATES_ENABLED === "true" };
}

export function isSafeCommercialUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && !value.includes("\\");
  } catch { return false; }
}

export function isConfiguredDisplayUnit(unit: DisplayAdUnit | undefined): unit is DisplayAdUnit {
  return Boolean(unit?.enabled && unit.id.trim() &&
    Number.isFinite(unit.width) && unit.width > 0 &&
    Number.isFinite(unit.height) && unit.height > 0);
}

export function isConfiguredCampaign(campaign: AffiliateCampaign): boolean {
  return campaign.enabled && Boolean(campaign.id.trim() && campaign.title.trim() &&
    campaign.description.trim() && campaign.cta.trim()) && isSafeCommercialUrl(campaign.href);
}

export function selectAffiliateCampaign(
  article: ArticleMetadata,
  campaigns: AffiliateCampaign[],
  position: AffiliatePosition,
): AffiliateCampaign | undefined {
  if (article.adPolicy === "off") return undefined;
  return campaigns.filter((campaign) => {
    if (!isConfiguredCampaign(campaign) || !campaign.positions.includes(position)) return false;
    if (article.affiliateCampaign) return campaign.id === article.affiliateCampaign;
    // Populated dimensions are ANDed; values inside a dimension are ORed.
    // Untargeted campaigns are never shown automatically to every reader.
    if (!campaign.categories?.length && !campaign.tags?.length) return false;
    return (!campaign.categories?.length || campaign.categories.includes(article.category)) &&
      (!campaign.tags?.length || campaign.tags.some((tag) => article.tags.includes(tag)));
  }).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.id.localeCompare(b.id))[0];
}
