import type { Metadata } from "next";
import ArticlePortal from "@/components/article-portal";
import JsonLd from "@/components/json-ld";
import AdSlot from "@/components/monetization/ad-slot";
import { getAllArticles } from "@/lib/articles";
import { getCategories } from "@/lib/categories";
import { absoluteUrl, siteName, siteDescription } from "@/lib/site";

const homeTitle = `${siteName}｜AIの仕組みを初心者向けに学べる解説サイト`;

export const metadata: Metadata = {
  title: { absolute: homeTitle },
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website", title: homeTitle, description: siteDescription,
    url: absoluteUrl("/"), siteName, locale: "ja_JP",
  },
  twitter: { card: "summary", title: homeTitle, description: siteDescription },
};

export default function Home() {
  const articles = getAllArticles();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  const siteData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteName,
    url: absoluteUrl("/"),
    description: siteDescription,
    inLanguage: "ja",
    publisher: { "@type": "Organization", name: siteName, url: absoluteUrl("/") },
  };
  return <>
    <JsonLd data={siteData} />
    <h1 className="sr-only">{homeTitle}</h1>
    <ArticlePortal articles={articles} categories={getCategories(articles)} today={today} sidebarSlot={<AdSlot position="sidebar" />} />
  </>;
}
