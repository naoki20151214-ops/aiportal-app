import type { ReactNode } from "react";
import { monetizationConfig } from "@/config/monetization";
import { getMonetizationFlags, isConfiguredDisplayUnit } from "@/lib/monetization";
import type { AdPosition, DisplayAdType, DisplayAdUnit } from "@/types/monetization";
import { displayAdRenderers } from "./ad-providers";
import CommercialDisclosure from "./commercial-disclosure";

type Props = { position: AdPosition; type?: DisplayAdType; unit?: DisplayAdUnit; children?: ReactNode };

export default function AdSlot({ position, type, unit = monetizationConfig.displayAds[position], children }: Props) {
  if (!getMonetizationFlags().adsEnabled || !isConfiguredDisplayUnit(unit) || (type && type !== unit.type)) return null;
  const content = children ?? displayAdRenderers[unit.provider]?.(unit, position);
  if (content === undefined || content === null || content === false || content === "") return null;
  return (
    <aside aria-label="広告" data-ad-position={position} data-ad-type={unit.type} className="my-8">
      <CommercialDisclosure kind="display" />
      <div style={{ width: "100%", maxWidth: unit.width, height: unit.height, overflow: "hidden" }}>
        {content}
      </div>
    </aside>
  );
}
