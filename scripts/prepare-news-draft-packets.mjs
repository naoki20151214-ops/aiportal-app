#!/usr/bin/env node
// Run manually, only after documented human fact-check of candidates.
// Converts human-reviewed notes into private model input; never invokes a model,
// writes article Markdown, changes the approval ledger, or publishes anything.
import fs from "node:fs";
import path from "node:path";
import {prepareJapaneseDraftPacket} from "./news-draft-contract.mjs";

const args = process.argv.slice(2);
if (args.some(a => !/^--(triage|reviews|out)=/.test(a)))
  throw new Error("Unknown news drafting input");
const resolveArg = (name, fallback) => {
  const matches = args.filter(a => a.startsWith("--" + name + "="));
  if (matches.length > 1) throw new Error("Duplicate option: " + name);
  const value = matches[0]?.slice(name.length + 3) ?? fallback;
  if (!/^artifacts\/[a-z0-9-]+\.json$/.test(value))
    throw new Error("Only local artifacts/*.json files supported");
  return value;
};
const triagePath = resolveArg("triage", "artifacts/news-editorial-triage.json");
const reviewsPath = resolveArg("reviews", "artifacts/news-editorial-reviews.json");
const outPath = resolveArg("out", "artifacts/news-draft-packets.json");
if (new Set([triagePath,reviewsPath,outPath]).size !== 3)
  throw new Error("Input and output paths must all differ");

const triage = JSON.parse(fs.readFileSync(triagePath, "utf8"));
const reviews = JSON.parse(fs.readFileSync(reviewsPath, "utf8"));
if (triage.schemaVersion !== 1 || triage.stage !== "private-editorial-triage" ||
    triage.publishingEnabled !== false || triage.newsApprovedCount !== 0 ||
    !Array.isArray(triage.items) || triage.items.length > 100)
  throw new Error("Invalid or non-private triage");
if (reviews.schemaVersion !== 1 || reviews.publishingEnabled !== false ||
    !Array.isArray(reviews.reviews) || reviews.reviews.length > 10)
  throw new Error("Invalid or non-private human reviews");

const itemMap = new Map();
for (const item of triage.items) {
  if (!/^[a-f0-9]{24}$/.test(item?.candidateId ?? "") || itemMap.has(item.candidateId) ||
      item.editorialDecision !== "unreviewed" || item.publicationEligible !== false)
    throw new Error("Untrusted triage item");
  itemMap.set(item.candidateId,item);
}
const seen = new Set();
const packets = reviews.reviews.map(review => {
  if (!/^[a-f0-9]{24}$/.test(review?.candidateId ?? "") ||
      seen.has(review.candidateId) || !itemMap.has(review.candidateId))
    throw new Error("Duplicate, invalid or unknown human review");
  seen.add(review.candidateId);
  return prepareJapaneseDraftPacket(review, itemMap.get(review.candidateId));
});
const result = {
  schemaVersion: 1,
  type: "private-japanese-news-draft-packets",
  publishingEnabled: false,
  articlesPublished: 0,
  generatedAt: new Date().toISOString(),
  requiresHumanJapaneseReview: true,
  packets,
};
fs.mkdirSync(path.dirname(outPath), {recursive: true});
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + "\n", "utf8");
console.log("AI news private drafting packets: " + packets.length +
  "; published=0; model calls=0; human review required");
