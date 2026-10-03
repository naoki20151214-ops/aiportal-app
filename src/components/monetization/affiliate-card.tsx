import { getMonetizationFlags, isConfiguredCampaign } from "@/lib/monetization";
import type { AffiliateCampaign } from "@/types/monetization";
import CommercialDisclosure from "./commercial-disclosure";

export default function AffiliateCard({ campaign }: { campaign: AffiliateCampaign }) {
  if (!getMonetizationFlags().affiliatesEnabled || !isConfiguredCampaign(campaign)) return null;
  return (
    <aside aria-label="PR・アフィリエイト" className="my-8 rounded border border-gray-200 p-4" data-affiliate-campaign={campaign.id}>
      <CommercialDisclosure kind="affiliate" />
      <h3 className="text-base font-bold text-gray-900">{campaign.title}</h3>
      <p className="text-sm text-gray-600 mt-2">{campaign.description}</p>
      <a href={campaign.href} rel="sponsored nofollow noopener noreferrer" target="_blank" className="inline-block text-sm font-bold text-blue-700 underline mt-3">
        {campaign.cta}
      </a>
    </aside>
  );
}
