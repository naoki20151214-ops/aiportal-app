#!/usr/bin/env node
// Editorial intake only: do not synthesize or publish candidate news.
import fs from "node:fs";
import path from "node:path";
import Parser from "rss-parser";
import {
  validateSourceConfig, itemsFromFeed, deduplicateCandidates,
  DEFAULT_LOOKBACK_HOURS, safeUrl,
} from "./news-candidate-core.mjs";

const config = JSON.parse(fs.readFileSync("content/news/sources.json", "utf8"));
const sources = validateSourceConfig(config);
const args = process.argv.slice(2);
if (args.some((x) => !x.startsWith("--out=") && !x.startsWith("--lookback-hours=")))
  throw new Error("Unknown news intake argument");
const outputArg = args.find((x) => x.startsWith("--out="));
const hoursArg = args.find((x) => x.startsWith("--lookback-hours="));
const output = outputArg?.slice(6) || "artifacts/news-candidates.json";
const lookbackHours = hoursArg ? Number(hoursArg.slice(17)) : DEFAULT_LOOKBACK_HOURS;
if (!Number.isInteger(lookbackHours) || lookbackHours < 1 || lookbackHours > 168)
  throw new Error("Invalid lookback duration");
if (!/^artifacts\/[a-z0-9-]+\.json$/.test(output))
  throw new Error("Output must be a local artifacts/*.json path");

const parser = new Parser();
const now = new Date();
const results = [], all = [];
for (const source of sources) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(source.feedUrl, {
      headers: {
        "User-Agent": "AIPortalNewsIntake/0.1 (+https://aiportal.blog/about)",
        "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml",
      },
      signal: controller.signal, redirect: "follow",
    });
    if (!response.ok || !safeUrl(response.url, source.allowedHosts))
      throw new Error("HTTP error or redirect outside official host");
    if (Number(response.headers.get("content-length") || 0) > 2000000)
      throw new Error("Official feed response too large");
    const xml = await response.text();
    if (Buffer.byteLength(xml, "utf8") > 2000000)
      throw new Error("Official feed content too large");
    const feed = await parser.parseString(xml);
    const items = itemsFromFeed(source, feed.items, now, lookbackHours);
    all.push(...items);
    results.push({
      sourceId: source.id, status: "ok",
      feedEntries: feed.items?.length || 0, windowCandidates: items.length,
    });
  } catch (error) {
    results.push({
      sourceId: source.id, status: "error",
      reason: error?.name === "AbortError" ? "fetch-timeout" : "feed-unavailable-or-malformed",
    });
  } finally { clearTimeout(timer); }
}
const candidates = deduplicateCandidates(all);
const report = {
  schemaVersion: 1,
  status: results.some((s) => s.status === "ok") ? "candidate-intake-only" : "no-usable-sources",
  generatedAt: now.toISOString(),
  lookbackHours,
  verificationPolicy: "Unverified. Read original official pages and verify claims before any publication.",
  publishingEnabled: false,
  sourceResults: results,
  exactDuplicateCount: all.length - candidates.length,
  candidates,
};
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + "\n", "utf8");
console.log("AI news intake: " + report.status + ", feed success=" +
  results.filter((s) => s.status === "ok").length + "/" + sources.length +
  ", pending=" + candidates.length + ", duplicates=" + report.exactDuplicateCount);
console.log("Private artifact written: " + output);
if (report.status === "no-usable-sources") process.exitCode = 1;
