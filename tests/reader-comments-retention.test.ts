import assert from "node:assert/strict";
import {test} from "node:test";
import {
  deletionSql,
  expireReaderComments,
  productionDatabase,
  retentionCutoff,
  retentionDays,
} from "../scripts/expire-reader-comments.mjs";

const fixedNow = new Date("2026-10-17T12:00:00.000Z");
const token = "test-token-never-logged";
const expiredNote = "expired private comment body";

function fakeFetch(rows: Array<{receivedAt: string; note: string}>, options: {failQuery?: boolean} = {}) {
  const requests: Array<{url: string; method: string; body?: {sql: string; params: string[]}}> = [];
  const fetchImpl = async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method || "GET";
    const body = init?.body ? JSON.parse(String(init.body)) as {sql: string; params: string[]} : undefined;
    assert.equal(new Headers(init?.headers).get("authorization"), `Bearer ${token}`);
    requests.push({url, method, body});
    if (method === "GET")
      return Response.json({success: true, result: {uuid: productionDatabase.databaseId, name: productionDatabase.databaseName}});
    if (options.failQuery)
      return Response.json({success: true, result: [{success: false, errors: [{message: expiredNote}]}]});
    assert.equal(body?.sql, deletionSql);
    assert.equal(body?.params.length, 1);
    const cutoff = body?.params[0] || "";
    const before = rows.length;
    for (let index = rows.length - 1; index >= 0; index--) {
      if (rows[index].receivedAt < cutoff) rows.splice(index, 1);
    }
    return Response.json({success: true, result: [{success: true, meta: {changes: before - rows.length}}]});
  };
  return {fetchImpl, requests};
}

test("retention cutoff is exactly 180 days and uses UTC ISO timestamps", () => {
  assert.equal(retentionDays, 180);
  assert.equal(retentionCutoff(fixedNow), "2026-04-20T12:00:00.000Z");
  assert.throws(() => retentionCutoff(new Date("not-a-date")), /Invalid retention job time/);
});

test("daily delete removes only comments strictly older than the cutoff", async () => {
  const cutoff = retentionCutoff(fixedNow);
  const rows = [
    {receivedAt: "2026-04-20T11:59:59.999Z", note: expiredNote},
    {receivedAt: cutoff, note: "exactly at the 180-day boundary"},
    {receivedAt: "2026-04-20T12:00:00.001Z", note: "newer comment"},
  ];
  const {fetchImpl, requests} = fakeFetch(rows);
  const result = await expireReaderComments({token, now: fixedNow, fetchImpl});

  assert.deepEqual(result, {cutoff, deletedRows: 1});
  assert.deepEqual(rows.map(row => row.note), ["exactly at the 180-day boundary", "newer comment"]);
  assert.equal(requests.length, 2);
  assert.ok(requests.every(request => request.url.includes(productionDatabase.databaseId)));
  assert.ok(requests[1].url.endsWith("/query"));
  assert.doesNotMatch(JSON.stringify(requests), new RegExp(expiredNote));
});

test("zero expired rows is a successful idempotent run", async () => {
  const {fetchImpl} = fakeFetch([{receivedAt: fixedNow.toISOString(), note: "new"}]);
  assert.deepEqual(await expireReaderComments({token, now: fixedNow, fetchImpl}), {
    cutoff: retentionCutoff(fixedNow), deletedRows: 0,
  });
});

test("D1 identity mismatch stops before issuing a delete", async () => {
  const requests: string[] = [];
  const fetchImpl = async (input: string | URL | Request) => {
    requests.push(String(input));
    return Response.json({success: true, result: {uuid: "preview-id", name: "aiportal-feedback-preview"}});
  };
  await assert.rejects(() => expireReaderComments({token, now: fixedNow, fetchImpl}), /identity check failed/);
  assert.equal(requests.length, 1);
  assert.ok(requests[0].includes(productionDatabase.databaseId));
});

test("Cloudflare failures stop the job without exposing response bodies", async () => {
  const {fetchImpl} = fakeFetch([], {failQuery: true});
  await assert.rejects(() => expireReaderComments({token, now: fixedNow, fetchImpl}),
    error => error instanceof Error && /retention query failed/.test(error.message) && !error.message.includes(expiredNote));
});

test("retention deployment is scheduled only from main and targets the Production database", async () => {
  const {readFileSync} = await import("node:fs");
  const workflow = readFileSync(".github/workflows/expire-reader-comments.yml", "utf8");
  const source = readFileSync("scripts/expire-reader-comments.mjs", "utf8");
  assert.match(workflow, /schedule:/);
  assert.match(workflow, /cron: "17 4 \* \* \*"/);
  assert.match(workflow, /if: github\.ref == 'refs\/heads\/main'/);
  assert.match(workflow, /secrets\.CLOUDFLARE_FEEDBACK_API_TOKEN/);
  assert.match(source, /DELETE FROM reader_comments WHERE received_at < \?/);
  assert.doesNotMatch(source, /DELETE FROM article_feedback/);
  assert.doesNotMatch(workflow, /PREVIEW/);
});
