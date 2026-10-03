import "server-only";

function getSiteUrl(): URL {
  const value = process.env.SITE_URL || (
    process.env.NODE_ENV === "production" ? "https://aiportal.blog" : "http://127.0.0.1:3000"
  );
  const url = new URL(value);
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password ||
      url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SITE_URLにはサイトのURL（例: https://example.com）を指定してください。");
  }
  return url;
}

export const siteUrl = getSiteUrl();
export const siteName = "AI Portal";
export const siteDescription = "AIの基礎から生成AI・AIエージェント・ツールの活用まで、体系的に学べる情報サイト。";

export function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}
