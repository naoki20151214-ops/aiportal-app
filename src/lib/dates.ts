export function formatArticleDate(value: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric", month: "long", day: "numeric", timeZone: "Asia/Tokyo",
  }).format(new Date(`${value}T00:00:00+09:00`));
}
