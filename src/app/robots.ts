import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // PREVIEW ONLY / NEVER MERGE: suppress indexing of unpublished review articles.
  const preview = process.env.CF_PAGES_BRANCH?.startsWith("preview/") ?? false;
  return preview
    ? { rules: { userAgent: "*", disallow: "/" } }
    : { rules: { userAgent: "*", allow: "/" }, sitemap: absoluteUrl("/sitemap.xml") };
}
