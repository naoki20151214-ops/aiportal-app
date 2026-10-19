// Bounded private evidence for editors; fetching a page is NOT verification of any claim.
// This module must never write public news, a registry, or an approval ledger.
import { safeUrl } from "./news-candidate-core.mjs";

export const MAX_PRIMARY_BYTES = 384000;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 3;

function decodeEntities(value) {
  return String(value).replace(/&(#x[0-9a-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity) => {
    const item = entity.toLowerCase();
    const table = { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " };
    if (Object.hasOwn(table, item)) return table[item];
    if (item.startsWith("#")) {
      const code = item.startsWith("#x") ?
        Number.parseInt(item.slice(2), 16) : Number.parseInt(item.slice(1), 10);
      return Number.isInteger(code) && code > 0 && code <= 0x10ffff &&
        !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : " ";
    }
    return match;
  });
}

function plainText(raw, limit) {
  return decodeEntities(String(raw || "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " "))
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .normalize("NFKC").replace(/\s+/g, " ").trim().slice(0, limit);
}

function tagText(html, tag, limit) {
  const match = html.match(new RegExp("<" + tag + "\\b[^>]*>([\\s\\S]*?)<\\/" + tag + "\\s*>", "i"));
  return match ? plainText(match[1], limit) : "";
}

function attrs(tag) {
  const result = {};
  for (const match of tag.matchAll(/([a-z][a-z0-9:_-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi))
    result[match[1].toLowerCase()] = match[2] ?? match[3];
  return result;
}

export function extractPrimaryPageMetadata(html) {
  if (typeof html !== "string") throw new Error("Invalid page body");
  const metadata = new Map();
  for (const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    const attr = attrs(tag);
    const key = (attr.property || attr.name || "").toLowerCase();
    if (key && typeof attr.content === "string" && !metadata.has(key))
      metadata.set(key, attr.content);
  }
  const firstDate = [
    "article:published_time", "datepublished", "date", "pubdate",
    "dc.date.issued", "dc.date", "citation_publication_date",
  ].map(key => metadata.get(key)).find(value => value && Number.isFinite(Date.parse(value)));
  const timeTag = (html.match(/<time\b[^>]*>/i) || [])[0];
  const timeValue = timeTag ? attrs(timeTag).datetime : null;
  const dateValue = firstDate || (timeValue && Number.isFinite(Date.parse(timeValue)) ? timeValue : null);
  const headline = tagText(html, "h1", 240);
  const documentTitle = tagText(html, "title", 240);
  const description = plainText(metadata.get("description") || metadata.get("og:description"), 320);
  const paragraph = (html.match(/<p\b[^>]*>[\s\S]*?<\/p\s*>/gi) || [])
    .map(value => tagText(value, "p", 320)).find(value => value.length >= 40);
  return {
    documentTitle, headline,
    pagePublishedAt: dateValue ? new Date(Date.parse(dateValue)).toISOString() : null,
    leadExcerpt: paragraph || description || "",
  };
}

// Check redirect targets with the existing strict host policy, but preserve
// the publisher's actual trailing slash. RSS canonicalization removes it;
// applying that canonicalization to a live Location header can cause 301 loops.
export function safePrimaryRedirectUrl(raw, hosts) {
  const safe = safeUrl(raw, hosts);
  if (!safe) return null;
  const incoming = new URL(raw);
  const target = new URL(safe);
  if (incoming.pathname.length > 1 && incoming.pathname.endsWith("/"))
    target.pathname += "/";
  return target.toString();
}

// Bound memory and network usage even on multi-megabyte official web pages.
// A prefix only is useful for private discovery, never a complete fact check.
async function boundedHtml(response) {
  const declared = Number(response.headers.get("content-length"));
  if (!response.body) throw new Error("empty-html-body");
  const reader = response.body.getReader();
  const buffers = [];
  let total = 0, truncated = false;
  try {
    while (true) {
      const {done, value} = await reader.read();
      if (done) break;
      const remaining = MAX_PRIMARY_BYTES - total;
      if (value.byteLength > remaining) {
        if (remaining > 0) {
          buffers.push(value.subarray(0, remaining));
          total += remaining;
        }
        truncated = true;
        break;
      }
      total += value.byteLength;
      buffers.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  const body = new Uint8Array(total);
  let cursor = 0;
  for (const item of buffers) { body.set(item, cursor); cursor += item.byteLength; }
  return {
    html: new TextDecoder("utf-8", {fatal: false}).decode(body),
    truncated: truncated || (Number.isFinite(declared) && declared > MAX_PRIMARY_BYTES),
  };
}

export async function fetchPrimaryPage(candidate, source, fetchImpl = fetch) {
  const originalUrl = safeUrl(candidate?.originalUrl, source?.allowedHosts);
  if (!originalUrl || typeof candidate?.id !== "string")
    return {status: "fetch-failed", reason: "unsafe-candidate-url"};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let current = originalUrl;
  const visited = new Set();
  try {
    for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
      if (visited.has(current)) throw new Error("redirect-cycle");
      visited.add(current);
      const response = await fetchImpl(current, {
        redirect: "manual", signal: controller.signal,
        headers: {
          "User-Agent": "AIPortalEditorialEvidence/0.1 (+https://aiportal.blog/about)",
          "Accept": "text/html,application/xhtml+xml",
        },
      });
      if (REDIRECT_STATUSES.has(response.status)) {
        if (redirects === MAX_REDIRECTS) throw new Error("redirect-limit");
        const location = response.headers.get("location");
        // A publisher may redirect an article to another *explicitly approved*
        // official domain. Never accept these domains as direct RSS candidates.
        const redirectHosts = [...source.allowedHosts, ...(source.redirectHosts ?? [])];
        const next = location ? safePrimaryRedirectUrl(new URL(location, current).href, redirectHosts) : null;
        if (!next) throw new Error("unsafe-redirect");
        await response.body?.cancel().catch(() => {});
        current = next;
        continue;
      }
      if (response.status !== 200) throw new Error("http-" + response.status);
      const type = (response.headers.get("content-type") || "").toLowerCase();
      if (!/^(text\/html|application\/xhtml\+xml)(;|$)/.test(type))
        throw new Error("not-html");
      const {html, truncated} = await boundedHtml(response);
      const page = extractPrimaryPageMetadata(html);
      if (!page.documentTitle && !page.headline && !page.leadExcerpt)
        throw new Error(truncated ? "html-too-large" : "missing-page-content");
      return {
        status: "retrieved-for-editorial-review",
        finalUrl: current, httpStatus: response.status,
        pageCoverage: truncated ? "bounded-prefix-only" : "complete-response",
        ...page,
        editorialStatus: "unreviewed",
        claimVerification: "not-performed",
        publicationEligible: false,
      };
    }
    throw new Error("redirect-limit");
  } catch (error) {
    const reasons = new Set(["redirect-limit", "redirect-cycle", "unsafe-redirect",
      "not-html", "html-too-large", "empty-html-body", "missing-page-content"]);
    const reason = controller.signal.aborted ? "fetch-timeout" :
            (reasons.has(error?.message) || /^http-[1-5]\d\d$/.test(error?.message ?? ""))
        ? error.message : "fetch-or-parse-error";
    return {status: "fetch-failed", reason, editorialStatus: "unreviewed",
      claimVerification: "not-performed", publicationEligible: false};
  } finally {
    clearTimeout(timer);
  }
}
