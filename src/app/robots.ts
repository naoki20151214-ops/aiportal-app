import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const isPreview = process.env.CF_PAGES_BRANCH?.startsWith("preview/") ?? false;
  return isPreview ? { rules: { userAgent: "*", disallow: "/" } } : { rules: { userAgent: "*", allow: "/" }, sitemap: absoluteUrl("/sitemap.xml") };
}
