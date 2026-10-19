import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";
import {
  triageNewsEvidence, validateNewsEditorialReview,
} from "../scripts/news-editorial-gate.mjs";

const candidateId = "0123456789abcdef01234567";
const anotherId = "abcdef0123456789abcdef01";
const url = "https://openai.com/index/new-model";
const page = {
  candidateId, sourceId: "openai", originalUrl: url,
  rssTitle: "OpenAI launches new model for developer tools",
  rssPublishedAt: "2026-10-15T10:00:00.000Z",
  pagePublishedAt: "2026-10-15T10:00:00.000Z",
  status: "retrieved-for-editorial-review",
  headline: "OpenAI launches new model for developer tools",
  editorialStatus: "unreviewed", claimVerification: "not-performed",
  publicationEligible: false,
};
const report = {
  schemaVersion: 1, status: "editorial-evidence-only",
  publishingEnabled: false, editorialApprovals: 0,
  results: [page, {
    ...page, candidateId: anotherId, sourceId: "openai",
    originalUrl: "https://openai.com/index/second-post",
    rssTitle: "OpenAI launches new model for developer tools today",
    pagePublishedAt: null,
  }],
};
const sampleReview = {
  schemaVersion: 1, candidateId, originalUrl: url, decision: "draft-ready",
  reviewer: "Editorial QA", reviewedAt: "2026-10-16T01:00:00.000Z",
  whyItMatters: "This could influence what AI readers can use, subject to its actual published restrictions.",
  whatChanges: "The stated capabilities or availability may change for the relevant users.",
  headlineBeyond: "The important verified insight is how the restrictions change what readers can actually use.",
  readerPayoff: "After one minute, readers can check whether the announced feature is relevant to their own usage.",
  limitations: "Read availability restrictions and the conditions directly in the original source.",
  checks: {
    originalRead: true, datesChecked: true, claimsChecked: true,
    limitationsChecked: true, duplicationChecked: true,
    independentContextConsidered: true,
  },
  claims: [{
    statement: "The company reported a product update under certain conditions.",
    evidence: [{
      url,
      supportingExcerpt: "Original company statement inspected by the named reviewer.",
    }],
  }],
};

test("Triage labels are review aids, never confirmations or authorization", () => {
  const triage = triageNewsEvidence(report);
  assert.equal(triage.stage, "private-editorial-triage");
  assert.equal(triage.publishingEnabled, false);
  assert.equal(triage.newsApprovedCount, 0);
  assert.equal(triage.items.length, 2);
  assert.equal(triage.items[0].dateNeedsReview, false);
  assert.equal(triage.items[1].dateNeedsReview, true);
  assert.ok(triage.items[0].topicHints.includes("model-or-release"));
  assert.ok(triage.items[0].possibleDuplicateIds.includes(anotherId));
  assert.equal(triage.items[0].publicationEligible, false);
  assert.equal(triage.items[0].accuracyNeedsReview, true);
  assert.equal(triage.items[0].rssPublishedAt,"2026-10-15T10:00:00.000Z");
});

test("Triage rejects untrusted reports, duplicate IDs and published statuses", () => {
  assert.throws(() => triageNewsEvidence({...report, publishingEnabled: true}), /Not a private/);
  assert.throws(() => triageNewsEvidence({...report, editorialApprovals: 1}), /Not a private/);
  assert.throws(() => triageNewsEvidence({
    ...report, results: [page, {...page}],
  }), /Untrusted editorial candidate/);
});

test("Historical Git archive flags published and rejected repeats without silently suppressing them", () => {
  const archive = {schemaVersion: 1, entries: [
    {id: "NEWS-0093", status: "rejected", slug: "old-rejected",
      title: "Different rejected headline", primarySource: url, sourceUrls: [url]},
  ]};
  const triage = triageNewsEvidence(report, archive);
  assert.equal(triage.items.length, 2);
  assert.deepEqual(triage.items[0].historicalMatches.map((x:{id:string})=>x.id), ["NEWS-0093"]);
  assert.equal(triage.items[0].historicalMatchNeedsReview, true);
  assert.equal(triage.items[0].rejectedHistoricalMatchNeedsReview, true);
  assert.equal(triage.items[0].editorialDecision, "unreviewed");
  assert.equal(triage.items[0].publicationEligible, false);
  assert.equal(triage.items[1].historicalMatchNeedsReview, false);
  assert.throws(()=>triageNewsEvidence(report,{schemaVersion:1,entries:null}),/Invalid canonical/);
});

test("A documented human review permits drafting only; never publication", () => {
  const triage = triageNewsEvidence(report).items[0];
  const value = validateNewsEditorialReview(sampleReview, triage);
  assert.equal(value.valid, true);
  assert.equal(value.draftEligible, true);
  assert.equal(value.publicationEligible, false);
});

test("A named reviewer, all checks and claim-to-source citations are required", () => {
  const triage = triageNewsEvidence(report).items[0];
  const partial = {
    ...sampleReview,
    reviewer: "",
    checks: {...sampleReview.checks, claimsChecked: false},
    claims: [{...sampleReview.claims[0], evidence: [{
      url: "http://unsafe.invalid/claims",
      supportingExcerpt: "",
    }]}],
  };
  const value = validateNewsEditorialReview(partial, triage);
  assert.equal(value.valid, false);
  assert.equal(value.draftEligible, false);
  assert.equal(value.publicationEligible, false);
  assert.ok(value.reasons.length >= 3);
  assert.equal(validateNewsEditorialReview({...sampleReview, headlineBeyond: ""}, triage).valid, false);
  assert.equal(validateNewsEditorialReview({...sampleReview, readerPayoff: ""}, triage).valid, false);
  assert.equal(validateNewsEditorialReview({...sampleReview, decision: "published"}, triage).valid, false);
  assert.equal(validateNewsEditorialReview({...sampleReview, candidateId: anotherId}, triage).valid, false);
  assert.equal(validateNewsEditorialReview(sampleReview, {...triage, retrievalStatus: "fetch-failed"}).valid, false);
});

test("Official China-model and cybersecurity pages remain manual leads, not unapproved RSS intake", () => {
  const watch = JSON.parse(readFileSync("content/news/editorial-source-watchlist.json", "utf8"));
  const active = JSON.parse(readFileSync("content/news/sources.json", "utf8"));
  assert.equal(watch.enabledInScheduledIntake,false);
  assert.equal(watch.publicationEligible,false);
  assert.equal(watch.entries.length,7);
  assert.equal(active.sources.length,6);
  const activeIds = new Set(active.sources.map((x:{id:string})=>x.id));
  for(const entry of watch.entries) {
    assert.equal(entry.discovery,"manual-only");
    assert.ok(entry.feedStatus.includes("not-verified") || entry.feedStatus.includes("not-admitted"));
    assert.ok(!activeIds.has(entry.id));
    assert.equal(new URL(entry.officialPage).protocol,"https:");
  }
  assert.ok(watch.entries.some((x:{id:string})=>x.id==="qwen"));
  assert.ok(watch.entries.some((x:{id:string})=>x.id==="google-threat-intelligence"));
});

test("Only read-only intake creates private triage, not the 20:00 learning publication workflow", () => {
  const intake = parse(readFileSync(".github/workflows/news-candidates.yml", "utf8"));
  const steps = intake.jobs.collect.steps as Array<{run?:string; with?:{path?:string}}>;
  assert.equal(intake.permissions.contents, "read");
  assert.equal(intake.on.schedule[0].cron, "0 0-14,22-23 * * *");
  assert.ok(steps.some(s=>String(s.run || "").includes("triage-news-evidence.mjs")));
  assert.ok(steps.some(s=>s.with?.path === "artifacts/news-editorial-triage.json"));
  assert.ok(!steps.some(s => /git push|auto-publish-approved|article-approval-log/.test(String(s.run || ""))));
  const publisher = parse(readFileSync(".github/workflows/publish-approved.yml", "utf8"));
  assert.equal(publisher.on.schedule[0].cron, "0 11 * * *");
  const source = readFileSync("scripts/triage-news-evidence.mjs", "utf8");
  assert.ok(!/content\/articles|git push|published-article-slugs/.test(source));
});
