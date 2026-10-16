#!/usr/bin/env node

// Production-only daily retention job. The target database is deliberately
// fixed here; callers cannot supply a database ID or table name.
export const productionDatabase = Object.freeze({
  accountId: "fd4fe7df0d653a3c4c5969244430f6e2",
  databaseId: "83018ded-a41d-4418-b4b5-57adb951242a",
  databaseName: "aiportal-feedback-production",
});

export const retentionDays = 180;
export const deletionSql = "DELETE FROM reader_comments WHERE received_at < ?";
const apiBase = "https://api.cloudflare.com/client/v4";
const retentionMilliseconds = retentionDays * 24 * 60 * 60 * 1000;

export function retentionCutoff(now = new Date()) {
  const timestamp = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(timestamp)) throw new Error("Invalid retention job time.");
  return new Date(timestamp - retentionMilliseconds).toISOString();
}

async function cloudflareRequest(fetchImpl, token, method, url, body) {
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        ...(body ? {"Content-Type": "application/json"} : {}),
      },
      ...(body ? {body: JSON.stringify(body)} : {}),
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw new Error("Cloudflare request failed.");
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error("Cloudflare returned an invalid response.");
  }
  if (!response.ok || payload?.success !== true)
    throw new Error("Cloudflare request was rejected.");
  return payload.result;
}

export async function expireReaderComments({
  token = process.env.CLOUDFLARE_FEEDBACK_API_TOKEN,
  now = new Date(),
  fetchImpl = fetch,
} = {}) {
  if (typeof token !== "string" || token.length < 12)
    throw new Error("Cloudflare API credential is unavailable.");

  const databasePath = `/accounts/${productionDatabase.accountId}/d1/database/${productionDatabase.databaseId}`;
  const baseUrl = apiBase + databasePath;
  const database = await cloudflareRequest(fetchImpl, token, "GET", baseUrl);
  if (database?.uuid !== productionDatabase.databaseId ||
      database?.name !== productionDatabase.databaseName)
    throw new Error("Production D1 identity check failed; no comments were deleted.");

  const cutoff = retentionCutoff(now);
  const results = await cloudflareRequest(fetchImpl, token, "POST", baseUrl + "/query", {
    sql: deletionSql,
    params: [cutoff],
  });
  if (!Array.isArray(results) || results.length !== 1 || results[0]?.success !== true ||
      !Number.isSafeInteger(results[0]?.meta?.changes) || results[0].meta.changes < 0)
    throw new Error("Production reader-comment retention query failed.");

  return {cutoff, deletedRows: results[0].meta.changes};
}

if (process.argv[1]?.endsWith("/expire-reader-comments.mjs")) {
  expireReaderComments().then(({cutoff, deletedRows}) => {
    console.log(`Production reader-comment retention completed: ${deletedRows} expired rows deleted before ${cutoff}.`);
  }).catch(() => {
    // Never print Cloudflare payloads, response bodies, credentials, or comments.
    console.error("Production reader-comment retention failed. Inspect the GitHub Actions run and Cloudflare D1 status.");
    process.exitCode = 1;
  });
}
