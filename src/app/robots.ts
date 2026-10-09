import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // Preview branches are for human review only and must not be indexed.
  // This branch exists only to expose the Level 1 BAS-0056 revision for visual approval.
  const isPreview = process.env.CF_PAGES_BRANCH?.startsWith("preview/") ?? false;
  return isPreview
    ? { rules: { userAgent: "*", disallow: "/" } }
    : { rules: { userAgent: "*", allow: "/" }, sitemap: absoluteUrl("/sitemap.xml") };
}
