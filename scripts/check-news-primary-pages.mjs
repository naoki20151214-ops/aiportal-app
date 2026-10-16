#!/usr/bin/env node
// Strictly private, read-only editorial evidence. Never publishes or approves news.
import fs from "node:fs";
import path from "node:path";
import {validateSourceConfig} from "./news-candidate-core.mjs";
import {fetchPrimaryPage} from "./news-primary-source-core.mjs";

const args = process.argv.slice(2);
if (args.some(arg => !arg.startsWith("--in=") && !arg.startsWith("--out=")))
  throw new Error("Unknown primary-source evidence argument");
const input = args.find(arg => arg.startsWith("--in="))?.slice(5) || "artifacts/news-candidates.json";
const output = args.find(arg => arg.startsWith("--out="))?.slice(6) || "artifacts/news-primary-evidence.json";
if (![input, output].every(value => /^artifacts\/[a-z0-9-]+\.json$/.test(value)) || input === output)
  throw new Error("Input and output must be separate local artifacts/*.json paths");

const sources = validateSourceConfig(JSON.parse(fs.readFileSync("content/news/sources.json", "utf8")));
const bySource = new Map(sources.map(source => [source.id, source]));
const report = JSON.parse(fs.readFileSync(input, "utf8"));
if (report.schemaVersion !== 1 || report.publishingEnabled !== false ||
    !Array.isArray(report.candidates) || report.candidates.length > 100)
  throw new Error("Invalid or non-private candidate report");

const uniqueIds = new Set();
for (const candidate of report.candidates) {
  if (!candidate || typeof candidate.id !== "string" || !/^[a-f0-9]{24}$/.test(candidate.id) ||
      uniqueIds.has(candidate.id) || !bySource.has(candidate.sourceId) ||
      candidate.verificationStatus !== "pending-primary-source-review")
    throw new Error("Untrusted candidate report");
  uniqueIds.add(candidate.id);
}

const results = [];
// Bounded concurrency to avoid overwhelming source websites or runners.
for (let i = 0; i < report.candidates.length; i += 4) {
  const batch = report.candidates.slice(i, i + 4);
  const evidence = await Promise.all(batch.map(async candidate => ({
    candidateId: candidate.id,
    sourceId: candidate.sourceId,
    rssTitle: candidate.title,
    rssPublishedAt: candidate.publishedAt,
    originalUrl: candidate.originalUrl,
    ...await fetchPrimaryPage(candidate, bySource.get(candidate.sourceId)),
  })));
  results.push(...evidence);
}

const retrieved = results.filter(item => item.status === "retrieved-for-editorial-review").length;
const evidenceReport = {
  schemaVersion: 1,
  status: "editorial-evidence-only",
  generatedAt: new Date().toISOString(),
  candidateReportGeneratedAt: report.generatedAt,
  publishingEnabled: false,
  editorialApprovals: 0,
  primaryClaimVerification: "not-performed",
  caveat: "Retrieved official web pages are evidence to review, NOT confirmation of claims. The editor must check original sources and publication conditions before any news is eligible.",
  summary: {candidates: results.length, retrieved, fetchFailed: results.length - retrieved},
  results,
};
fs.mkdirSync(path.dirname(output), {recursive: true});
fs.writeFileSync(output, JSON.stringify(evidenceReport, null, 2) + "\n", "utf8");
console.log("Private AI news primary-source review aid: pages retrieved=" + retrieved +
  "/" + results.length + "; claims verified=0; publishing=false");
if (results.length > 0 && retrieved === 0) process.exitCode = 1;
