import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";
import {
  extractPrimaryPageMetadata, fetchPrimaryPage, MAX_PRIMARY_BYTES,
} from "../scripts/news-primary-source-core.mjs";

const candidate = {
  id: "0123456789abcdef01234567",
  originalUrl: "https://openai.com/index/launch",
  sourceId: "openai",
  title: "An official launch announcement",
  publishedAt: "2026-10-15T00:00:00.000Z",
  verificationStatus: "pending-primary-source-review",
};
const source = {id: "openai", allowedHosts: ["openai.com"]};
const html = '<html><head><meta content="2026-10-15T10:00:00Z" property="article:published_time">' +
  '<title>Official &amp; New</title></head><body>' +
  '<h1>Official <em>announcement</em></h1>' +
  '<p>We are introducing a model and explain its availability, limitations and other important considerations.</p>' +
  '</body></html>';

test("Official page evidence extracts bounded title, date and lead, never verifies a claim", async () => {
  const parsed = extractPrimaryPageMetadata(html);
  assert.equal(parsed.documentTitle, "Official & New");
  assert.equal(parsed.headline, "Official announcement");
  assert.equal(parsed.pagePublishedAt, "2026-10-15T10:00:00.000Z");
  assert.match(parsed.leadExcerpt, /availability, limitations/);
  const result = await fetchPrimaryPage(candidate, source, async () =>
    new Response(html, {headers: {"content-type": "text/html; charset=utf-8"}}));
  assert.equal(result.status, "retrieved-for-editorial-review");
  assert.equal(result.claimVerification, "not-performed");
  assert.equal(result.editorialStatus, "unreviewed");
  assert.equal(result.publicationEligible, false);
  if (!("finalUrl" in result)) throw new Error("Expected retrieved page URL");
  assert.equal(result.finalUrl, candidate.originalUrl);
  assert.ok(!("fullArticle" in result));
});

test("HTTPS, official host, redirects and max hops block off-site fetching", async () => {
  let calls = 0;
  const outside = await fetchPrimaryPage({...candidate, originalUrl: "https://evil.example/x"},
    source, async () => {calls++; throw Error("must not fetch");});
  assert.equal(outside.reason, "unsafe-candidate-url");
  assert.equal(calls, 0);
  const redirect = await fetchPrimaryPage(candidate, source, async () => {
    calls++;
    return new Response(null, {status: 302, headers: {location: "https://openai.com.evil.example/x"}});
  });
  assert.equal(redirect.reason, "unsafe-redirect");
  assert.equal(redirect.publicationEligible, false);
  assert.equal(calls, 1);
  const looping = await fetchPrimaryPage(candidate, source, async () =>
    new Response(null, {status: 301, headers: {location: "/index/launch"}}));
  assert.equal(looping.reason, "redirect-limit");
});

test("Only bounded HTML is accepted; PDF and oversized responses are rejected", async () => {
  const pdf = await fetchPrimaryPage(candidate, source, async () =>
    new Response("PDF", {headers: {"content-type": "application/pdf"}}));
  assert.equal(pdf.reason, "not-html");
  const oversized = await fetchPrimaryPage(candidate, source, async () =>
    new Response(html, {headers: {
      "content-type": "text/html",
      "content-length": String(MAX_PRIMARY_BYTES + 1),
    }}));
  assert.equal(oversized.reason, "html-too-large");
  assert.equal(oversized.publicationEligible, false);
});

test("Missing publication date cannot be silently inferred from RSS", async () => {
  const result = await fetchPrimaryPage(candidate, source, async () =>
    new Response('<html><head><title>No Date</title></head><body><h1>Launch update</h1></body></html>',
      {headers: {"content-type": "text/html"}}));
  assert.equal(result.status, "retrieved-for-editorial-review");
  if (!("pagePublishedAt" in result)) throw new Error("Expected retrieved page metadata");
  assert.equal(result.pagePublishedAt, null);
  assert.equal(result.claimVerification, "not-performed");
});

test("Primary-page evidence is in private read-only intake, not the 20:00 publication pipeline", () => {
  const workflow = parse(readFileSync(".github/workflows/news-candidates.yml", "utf8"));
  const steps = workflow.jobs.collect.steps;
  assert.equal(workflow.permissions.contents, "read");
  assert.ok(steps.some((step: {run?: string}) =>
    String(step.run || "").includes("check-news-primary-pages.mjs")));
  assert.ok(steps.some((step: {with?: {path?: string}}) =>
    step.with?.path === "artifacts/news-primary-evidence.json"));
  assert.ok(!steps.some((step: {run?: string}) =>
    /git push|auto-publish-approved|publish-approved|article-approval-log/.test(String(step.run || ""))));
  assert.equal(workflow.on.schedule[0].cron, "0 22 * * *");
  const publish = parse(readFileSync(".github/workflows/publish-approved.yml", "utf8"));
  assert.equal(publish.on.schedule[0].cron, "0 11 * * *");
  assert.ok(!readFileSync("scripts/check-news-primary-pages.mjs", "utf8").includes("content/articles/"));
});
