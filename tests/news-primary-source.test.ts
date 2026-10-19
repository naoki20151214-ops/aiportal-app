import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";
import {parse} from "yaml";
import {
  extractPrimaryPageMetadata, fetchPrimaryPage, MAX_PRIMARY_BYTES, safePrimaryRedirectUrl,
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
  assert.equal(looping.reason, "redirect-cycle");
});


test("DeepMind RSS links may redirect to preapproved official Google blog only", async () => {
  const deepmind = {id: "deepmind", allowedHosts: ["deepmind.google"],
    redirectHosts: ["blog.google"]};
  const original = {...candidate,
    originalUrl: "https://deepmind.google/blog/introducing-gemini-4-argon"};
  const finalUrl = "https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-4-argon";
  const called: string[] = [];
  const result = await fetchPrimaryPage(original, deepmind, async input => {
    called.push(String(input));
    if (called.length === 1) return new Response(null, {status: 301,
      headers: {location: finalUrl}});
    return new Response(html, {headers: {"content-type": "text/html"}});
  });
  assert.equal(result.status, "retrieved-for-editorial-review");
  if (!("finalUrl" in result)) throw Error("Expected official final URL");
  assert.equal(result.finalUrl, finalUrl);
  assert.deepEqual(called, [original.originalUrl, finalUrl]);
  assert.equal(result.publicationEligible, false);
  const spoofed = await fetchPrimaryPage(original, deepmind, async () =>
    new Response(null, {status: 302,
      headers: {location: "https://blog.google.evil.example/claim"}}));
  assert.equal(spoofed.reason, "unsafe-redirect");
  const direct = await fetchPrimaryPage({...original, originalUrl: finalUrl},
    deepmind, async () => {throw Error("Direct alternate-domain feed URLs must never be fetched");});
  assert.equal(direct.reason, "unsafe-candidate-url");
});

test("Strict publisher redirect validation preserves mandatory trailing slash without opening new hosts", async () => {
  const original = {...candidate,originalUrl:"https://aws.amazon.com/blogs/machine-learning/example"};
  const aws={id:"aws-ai",allowedHosts:["aws.amazon.com"]};
  const finalUrl="https://aws.amazon.com/blogs/machine-learning/example/";
  assert.equal(safePrimaryRedirectUrl(finalUrl,aws.allowedHosts),finalUrl);
  assert.equal(safePrimaryRedirectUrl("https://aws.amazon.com.evil.example/x/",aws.allowedHosts),null);
  assert.equal(safePrimaryRedirectUrl("http://aws.amazon.com/example/",aws.allowedHosts),null);
  assert.equal(safePrimaryRedirectUrl("https://bad@aws.amazon.com/example/",aws.allowedHosts),null);
  const seen:string[]=[];
  const response=await fetchPrimaryPage(original,aws,async input=>{
    seen.push(String(input));
    return seen.length===1
      ? new Response(null,{status:301,headers:{location:finalUrl}})
      : new Response(html,{status:200,headers:{"content-type":"text/html"}});
  });
  assert.equal(response.status,"retrieved-for-editorial-review");
  if(!("finalUrl" in response))throw Error("Expected safe final URL");
  assert.equal(response.finalUrl,finalUrl);
  assert.deepEqual(seen,[original.originalUrl,finalUrl]);
  assert.equal(response.publicationEligible,false);
});

test("Redirect cycles and HTTP blocks remain distinct safe failure reasons",async()=>{
  let calls=0;
  const cyc=await fetchPrimaryPage(candidate,source,async()=>{
    calls++;
    return new Response(null,{status:301,headers:{location:candidate.originalUrl}});
  });
  assert.equal(cyc.reason,"redirect-cycle");
  assert.equal(calls,1);
  let blocks=0;
  const blocked=await fetchPrimaryPage(candidate,source,async()=>{
    blocks++;
    return new Response("Forbidden",{status:403});
  });
  assert.equal(blocked.reason,"http-403");
  assert.equal(blocks,1);
  assert.equal(blocked.publicationEligible,false);
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
  assert.equal(workflow.on.schedule[0].cron, "0 0-14,22-23 * * *");
  const publish = parse(readFileSync(".github/workflows/publish-approved.yml", "utf8"));
  assert.equal(publish.on.schedule[0].cron, "0 11 * * *");
  assert.ok(!readFileSync("scripts/check-news-primary-pages.mjs", "utf8").includes("content/articles/"));
});
