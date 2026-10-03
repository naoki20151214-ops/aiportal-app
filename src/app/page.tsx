import type { Metadata } from "next";
import ArticlePortal from "@/components/article-portal";
import { getAllArticles } from "@/lib/articles";
import { getCategories } from "@/lib/categories";
import { absoluteUrl, siteName, siteDescription } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website", title: siteName, description: siteDescription,
    url: absoluteUrl("/"), siteName, locale: "ja_JP",
  },
};

export default function Home() {
  const articles = getAllArticles();
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());
  return <ArticlePortal articles={articles} categories={getCategories(articles)} today={today} />;
}
