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

// Preserve the exact original candidate rules while making rejection reasons
// observable. Filtered RSS entries are not lost or silently called successes.
export function summarizeFeedEligibility(source,feedItems,now=new Date(),
    lookbackHours=DEFAULT_LOOKBACK_HOURS) {
  if(!(now instanceof Date)||Number.isNaN(now.getTime())||
     !Number.isInteger(lookbackHours)||lookbackHours<1||lookbackHours>168)
    throw new Error("Invalid candidate window");
  const items=Array.isArray(feedItems)?feedItems:[];
  const cutoff=now.getTime()-lookbackHours*3600000;
  const excludedByReason={
    "invalid-official-url":0,"short-title":0,"missing-or-invalid-date":0,
    "older-than-lookback":0,"future-date":0,
  };
  const candidates=[];
  for(const item of items) {
    const url=safeUrl(item?.link,source.allowedHosts);
    const title=normalizeTitle(item?.title);
    const raw=item?.isoDate||item?.pubDate;
    const ts=typeof raw==="string"?Date.parse(raw):NaN;
    let reason;
    if(!url)reason="invalid-official-url";
    else if(title.length<10)reason="short-title";
    else if(!Number.isFinite(ts))reason="missing-or-invalid-date";
    else if(ts<cutoff)reason="older-than-lookback";
    else if(ts>now.getTime()+5*60000)reason="future-date";
    if(reason){excludedByReason[reason]++;continue;}
    candidates.push({
      id:createHash("sha256").update(url).digest("hex").slice(0,24),
      sourceId:source.id,publisher:source.name,
      title,originalUrl:url,publishedAt:new Date(ts).toISOString(),
      discoveredBy:"official-feed-metadata",
      verificationStatus:"pending-primary-source-review",
    });
  }
  return {feedEntries:items.length,windowCandidates:candidates.length,
    excludedByReason,candidates};
}

export function itemsFromFeed(source,feedItems,now=new Date(),
    lookbackHours=DEFAULT_LOOKBACK_HOURS) {
  return summarizeFeedEligibility(source,feedItems,now,lookbackHours).candidates;
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
