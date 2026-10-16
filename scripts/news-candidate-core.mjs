import {createHash} from "node:crypto";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TRACKING_KEYS = new Set(["fbclid", "gclid", "mc_cid", "mc_eid", "ref", "source"]);
export const DEFAULT_LOOKBACK_HOURS = 72;

export function safeUrl(raw, allowedHosts) {
  if (typeof raw !== "string" || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
    if (!Array.isArray(allowedHosts) || !allowedHosts.some((host) =>
      url.hostname === host || url.hostname.endsWith("." + host))) return null;
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (key.toLowerCase().startsWith("utm_") || TRACKING_KEYS.has(key.toLowerCase())) {
        url.searchParams.delete(key);
      }
    }
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch { return null; }
}

export function normalizeTitle(raw) {
  if (typeof raw !== "string") return "";
  return raw.replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ")
    .normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, 240);
}

export function duplicateTitleKey(title) {
  return normalizeTitle(title).toLocaleLowerCase("en-US")
    .replace(/[\p{P}\p{S}\s]+/gu, "");
}

export function validateSourceConfig(config) {
  if (config?.schemaVersion !== 1 || !Array.isArray(config.sources) || !config.sources.length)
    throw new Error("Invalid news source registry");
  const ids = new Set();
  for (const source of config.sources) {
    if (!/^[a-z][a-z0-9-]{1,30}$/.test(source.id ?? "") || ids.has(source.id))
      throw new Error("Invalid or duplicate source ID");
    ids.add(source.id);
    if (!source.name || !Array.isArray(source.allowedHosts) ||
      !source.allowedHosts.length || !source.allowedHosts.every((h) =>
        /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(h)))
      throw new Error("Untrusted news source host configuration");
    // Redirect targets are editorial-fetch-only. They never widen which URLs
    // may arrive directly from the publisher's RSS feed.
    if (source.redirectHosts !== undefined &&
        (!Array.isArray(source.redirectHosts) || source.redirectHosts.length > 5 ||
         !source.redirectHosts.every((h) => typeof h === "string" &&
           /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(h) &&
           !source.allowedHosts.includes(h))))
      throw new Error("Invalid official news redirect hosts");
    if (!safeUrl(source.feedUrl, source.allowedHosts)) throw new Error("Unsafe RSS source URL");
  }
  return config.sources;
}

export function itemsFromFeed(source, feedItems, now = new Date(), lookbackHours = DEFAULT_LOOKBACK_HOURS) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime()) ||
      !Number.isInteger(lookbackHours) || lookbackHours < 1 || lookbackHours > 168)
    throw new Error("Invalid candidate window");
  const min = now.getTime() - lookbackHours * 3600000;
  return (Array.isArray(feedItems) ? feedItems : []).flatMap((item) => {
    const url = safeUrl(item?.link, source.allowedHosts);
    const title = normalizeTitle(item?.title);
    const dateRaw = item?.isoDate || item?.pubDate;
    const time = typeof dateRaw === "string" ? Date.parse(dateRaw) : NaN;
    // Reject undated items and future-dated items, never guess a publication date.
    if (!url || title.length < 10 || !Number.isFinite(time) || time < min ||
        time > now.getTime() + 5 * 60000) return [];
    return [{
      id: createHash("sha256").update(url).digest("hex").slice(0, 24),
      sourceId: source.id, publisher: source.name,
      title, originalUrl: url, publishedAt: new Date(time).toISOString(),
      discoveredBy: "official-feed-metadata",
      verificationStatus: "pending-primary-source-review",
    }];
  });
}

export function deduplicateCandidates(candidates) {
  const seenUrls = new Set(), seenTitles = new Set(), result = [];
  for (const candidate of [...candidates].sort((a,b) => b.publishedAt.localeCompare(a.publishedAt))) {
    const url = candidate.originalUrl;
    const title = duplicateTitleKey(candidate.title);
    if (!url || !title || seenUrls.has(url) || seenTitles.has(title)) continue;
    seenUrls.add(url);
    seenTitles.add(title);
    result.push(candidate);
  }
  return result;
}

export function shouldShowInNews(verificationStatus) {
  // No collected RSS candidate is eligible for public publication.
  return verificationStatus === "approved-and-published";
}

export function validJapanDate(value) {
  if (!DATE_RE.test(value ?? "")) return false;
  const date = new Date(value + "T00:00:00Z");
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0,10) === value;
}
