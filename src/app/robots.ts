import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // PREVIEW-ONLY: never expose this unfinished article to search engines.
  const isTransformerReview = process.env.CF_PAGES_BRANCH === "preview/transformer-red-hat-review";
  return isTransformerReview
    ? { rules: { userAgent: "*", disallow: "/" } }
    : { rules: { userAgent: "*", allow: "/" }, sitemap: absoluteUrl("/sitemap.xml") };
}
