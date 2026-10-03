import type { ReactNode } from "react";
import type { AdPosition, DisplayAdProvider, DisplayAdUnit } from "@/types/monetization";

export type DisplayAdRenderer = (unit: DisplayAdUnit, position: AdPosition) => ReactNode;

// Register a reviewed provider adapter here when actual ad settings are available.
// An AdSense adapter must load its script once and fit the AdSlot's reserved size.
export const displayAdRenderers: Partial<Record<DisplayAdProvider, DisplayAdRenderer>> = {};
