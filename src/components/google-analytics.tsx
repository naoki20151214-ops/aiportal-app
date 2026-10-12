import { AnalyticsConsent } from "./analytics-consent";

export function GoogleAnalyticsTag() {
  const measurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

  if (process.env.NODE_ENV !== "production" || !measurementId) {
    return null;
  }

  return <AnalyticsConsent gaId={measurementId} />;
}
