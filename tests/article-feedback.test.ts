import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";
import { validateFeedbackSubmission } from "../src/lib/article-feedback-schema";
import { publishedArticleSlugById } from "../src/generated/published-article-slugs";
import { onRequest } from "../functions/api/feedback";

const articleId = "BAS-0032";
const slug = "symbolic-ai";
const oneTapId = "e1b6c417-85c3-4a18-9e38-cc1102f5f677";
const correctionId = "37a8d0ea-b5a6-4776-a721-c2697c74308a";
const sample = {
  requestId: oneTapId,
  articleId,
  slug,
  revision: "2026-10-13",
  kind: "rating",
  rating: "difficult",
  reason: null,
  note: "",
  turnstileToken: "test-token",
};
type RecordRow = {
  id: string; articleId: string; slug: string; revision: string;
  kind: string; rating: string | null; reason: string | null; note: string;
};

function request(body: unknown, method = "POST", options?: { origin?: string; contentType?: string }) {
  return new Request("https://aiportal.blog/api/feedback", {
    method,
    headers: {
      Origin: options?.origin ?? "https://aiportal.blog",
      "Content-Type": options?.contentType ?? "application/json",
    },
    body: JSON.stringify(body),
  });
}
function database({ noTable = false, failWrites = false } = {}) {
  const rows = new Map<string, RecordRow>();
  return {
    rows,
    handle: {
      prepare(sql: string) {
        return {
          async first() {
            assert.match(sql, /^SELECT 1 AS ready FROM article_feedback LIMIT 1$/);
            if (noTable) throw new Error("D1 missing migration");
            return rows.size ? { ready: 1 } : null;
          },
          bind(...args: (string | null)[]) {
            return {
              async run() {
                if (failWrites) throw new Error("D1 unavailable");
                if (sql.startsWith("INSERT INTO article_feedback")) {
                  const [id, id2, slug2, revision, kind, rating, reason, note] = args;
                  assert.ok(id);
                  const previous = rows.get(id);
                  if (previous && (
                    previous.articleId !== id2 || previous.slug !== slug2 ||
                    previous.revision !== revision || previous.kind !== kind
                  )) return { success: true, meta: { changes: 0 } };
                  rows.set(id, {
                    id, articleId: id2!, slug: slug2!, revision: revision!, kind: kind!,
                    rating, reason, note: note!,
                  });
                  return { success: true, meta: { changes: 1 } };
                }
                if (sql.startsWith("UPDATE article_feedback")) {
                  const [rating, reason, id, id2, slug2, revision] = args;
                  const row = id ? rows.get(id) : undefined;
                  if (!row || row.articleId !== id2 || row.slug !== slug2 ||
                    row.revision !== revision || row.kind !== "rating")
                    return { success: true, meta: { changes: 0 } };
                  row.rating = rating;
                  row.reason = reason;
                  row.note = "";
                  return { success: true, meta: { changes: 1 } };
                }
                throw new Error("Unexpected SQL: " + sql);
              },
            };
          },
        };
      },
    },
  };
}

type FakeDB = ReturnType<typeof database>;
function env(db: FakeDB) {
  return { AI_PORTAL_FEEDBACK_ENABLED: "1", AI_PORTAL_FEEDBACK_DB: db.handle, TURNSTILE_SECRET_KEY: "secret" };
}
async function verified(action: () => Promise<void>, answer = { success: true, hostname: "aiportal.blog", action: "article_feedback" }) {
  const originalFetch = globalThis.fetch;
  let checks = 0;
  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    assert.equal(String(url), "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(options?.method, "POST");
    assert.match(String(options?.body), /secret=secret/);
    checks += 1;
    return Response.json(answer);
  }) as typeof fetch;
  try { await action(); } finally { globalThis.fetch = originalFetch; }
  return checks;
}

test("micro-feedback only accepts two values and an optional reason; no user identifiers are required", () => {
  const bad: Array<[unknown, string]> = [
    [null, "invalid_body"],
    [{ ...sample, requestId: "not-uuid" }, "invalid_request_id"],
    [{ ...sample, requestId: "00000000-0000-0000-0000-000000000000" }, "invalid_request_id"],
    [{ ...sample, articleId: "no" }, "invalid_article_id"],
    [{ ...sample, slug: "../hidden" }, "invalid_slug"],
    [{ ...sample, revision: "2026-02-30" }, "invalid_revision"],
    [{ ...sample, kind: "other" }, "invalid_kind"],
    [{ ...sample, rating: "partly" }, "invalid_rating"],
    [{ ...sample, rating: "perfect" }, "invalid_rating"],
    [{ ...sample, rating: "understood", reason: "jargon" }, "unexpected_reason"],
    [{ ...sample, reason: "unknown" }, "invalid_reason"],
    [{ ...sample, note: "unwanted text" }, "unexpected_note"],
    [{ ...sample, email: "pii@example.com" }, "unknown_field"],
    [{ ...sample, turnstileToken: "" }, "invalid_challenge_token"],
    [{ ...sample, kind: "correction", rating: null, reason: null, note: "短い" }, "correction_details_required"],
    [{ ...sample, kind: "correction", rating: null, reason: null, note: "A".repeat(501) }, "invalid_note"],
  ];
  for (const [payload, expected] of bad) {
    const actual = validateFeedbackSubmission(payload);
    assert.equal(actual.ok, false, expected);
    if (!actual.ok) assert.equal(actual.error, expected);
  }
  assert.equal(validateFeedbackSubmission(sample).ok, true);
  assert.equal(validateFeedbackSubmission({ ...sample, rating: "understood" }).ok, true);
  assert.equal(validateFeedbackSubmission({ ...sample, reason: "need-examples" }).ok, true);
  assert.equal(validateFeedbackSubmission({
    ...sample, requestId: correctionId,
    kind: "correction", rating: null, reason: null, note: "Transformerの定義が出典と異なります。",
  }).ok, true);
});

test("generated published-article allowlist matches production Registry", () => {
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const expected = Object.fromEntries(registry.nodes
    .filter((node: {status: string}) => node.status === "published")
    .map((node: {id: string; slug: string}) => [node.id, node.slug]));
  assert.deepEqual(publishedArticleSlugById, expected);
  assert.equal(publishedArticleSlugById["BAS-0020"], "multi-head-attention");
});

test("health check responds only when flag, D1, migration and Turnstile secret exist", async () => {
  const url = new Request("https://aiportal.blog/api/feedback");
  let response = await onRequest({ request: url, env: {} });
  assert.equal(response.status, 503);
  const emptyDB = database();
  response = await onRequest({ request: url, env: env(emptyDB) });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, available: true });
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  const missingTable = await onRequest({ request: url, env: env(database({ noTable: true })) });
  assert.equal(missingTable.status, 503);
});

test("disabled backend and hostile requests never write to D1", async () => {
  const db = database();
  assert.equal((await onRequest({ request: request(sample), env: {} })).status, 503);
  const enabled = env(db);
  assert.equal((await onRequest({ request: request(sample,"POST",{origin:"https://other.example"}), env: enabled })).status, 403);
  assert.equal((await onRequest({ request: request(sample,"POST",{contentType:"text/plain"}), env: enabled })).status, 415);
  assert.equal((await onRequest({ request: request({ ...sample, articleId: "BAS-9999" }), env: enabled })).status, 422);
  assert.equal((await onRequest({ request: request({ ...sample, slug: "not-the-article" }), env: enabled })).status, 422);
  assert.equal((await onRequest({ request: request(sample,"DELETE"), env: enabled })).status, 405);
  assert.equal((await onRequest({ request: request({ ...sample, kind: "correction", rating: null, reason: null, note: "誤りを確認してください。" },"PATCH"), env: enabled })).status, 422);
  assert.equal(db.rows.size, 0);
});

test("single tap stores exactly one vote, reason and changed answer PATCH the same row", async () => {
  const db = database();
  const count = await verified(async () => {
    const first = await onRequest({ request: request(sample), env: env(db) });
    assert.equal(first.status, 201);
    assert.deepEqual(await first.json(), { ok: true, receipt: oneTapId });
    assert.equal(db.rows.size, 1);
    assert.equal(db.rows.get(oneTapId)?.rating, "difficult");

    const withReason = await onRequest({
      request: request({ ...sample, reason: "need-examples", turnstileToken: "fresh-2" }, "PATCH"),
      env: env(db),
    });
    assert.equal(withReason.status, 200);
    assert.equal(db.rows.size, 1);
    assert.equal(db.rows.get(oneTapId)?.reason, "need-examples");

    const changed = await onRequest({
      request: request({ ...sample, rating: "understood", reason: null, turnstileToken: "fresh-3" }, "PATCH"),
      env: env(db),
    });
    assert.equal(changed.status, 200);
    assert.equal(db.rows.size, 1);
    assert.equal(db.rows.get(oneTapId)?.rating, "understood");
    assert.equal(db.rows.get(oneTapId)?.reason, null);
    assert.equal(db.rows.get(oneTapId)?.note, "");
  });
  assert.equal(count, 3, "all state changes require independently verified Turnstile tokens");
});

test("timed-out first POST can safely retry without inflating the response count", async () => {
  const db = database();
  await verified(async () => {
    assert.equal((await onRequest({ request: request(sample), env: env(db) })).status, 201);
    assert.equal((await onRequest({ request: request({ ...sample, turnstileToken: "fresh-retry" }), env: env(db) })).status, 201);
    assert.equal(db.rows.size, 1);
  });
});

test("random UUID cannot update someone else's article, revision, or kind", async () => {
  const db = database();
  await verified(async () => {
    await onRequest({ request: request(sample), env: env(db) });
    const another = await onRequest({
      request: request({ ...sample, requestId: correctionId }, "PATCH"), env: env(db),
    });
    assert.equal(another.status, 404);
    const stale = await onRequest({
      request: request({ ...sample, revision: "2026-10-12" }, "PATCH"), env: env(db),
    });
    assert.equal(stale.status, 404);
    assert.equal(db.rows.size, 1);
  });
});

test("a separate correction report is saved without replacing the vote", async () => {
  const db = database();
  await verified(async () => {
    await onRequest({ request: request(sample), env: env(db) });
    const note = "『マスク』の段落の説明が公式ドキュメントと違うと思います。";
    const correction = await onRequest({
      request: request({
        ...sample, requestId: correctionId, kind: "correction",
        rating: null, reason: null, note,
      }), env: env(db),
    });
    assert.equal(correction.status, 201);
    assert.equal(db.rows.size, 2);
    assert.equal(db.rows.get(correctionId)?.kind, "correction");
    assert.equal(db.rows.get(correctionId)?.note, note);
    assert.equal(db.rows.get(oneTapId)?.rating, "difficult");
  });
});

test("Turnstile rejection or mismatched hostname/action never persists a response", async () => {
  const db = database();
  for (const answer of [
    { success: false, hostname: "aiportal.blog", action: "article_feedback" },
    { success: true, hostname: "untrusted.example", action: "article_feedback" },
    { success: true, hostname: "aiportal.blog", action: "login" },
  ]) {
    await verified(async () => {
      const response = await onRequest({ request: request(sample), env: env(db) });
      assert.equal(response.status, 403);
    }, answer);
  }
  assert.equal(db.rows.size, 0);
});

test("storage outage is not mistaken for successful persisted feedback", async () => {
  const db = database({ failWrites: true });
  await verified(async () => {
    const response = await onRequest({ request: request(sample), env: env(db) });
    assert.equal(response.status, 503);
    assert.equal((await response.json() as {ok: boolean}).ok, false);
  });
});

test("static articles bypass Pages Functions, and rating never requires a send button", () => {
  const routes = JSON.parse(readFileSync("public/_routes.json", "utf8"));
  assert.deepEqual(routes, { version: 1, include: ["/api/feedback", "/api/reader-comment"], exclude: [] });
  const front = readFileSync("src/components/article-feedback.tsx", "utf8");
  assert.match(front, /data-feedback-widget="one-tap"/);
  assert.match(front, /😊 わかった/);
  assert.match(front, /🤔 まだ難しい/);
  assert.match(front, /onClick=\{\(\) => choose\(option\.value\)\}/);
  assert.match(front, /reason/);
  assert.match(front, /再試行/);
  assert.match(front, /お問い合わせフォームから送る/);
  assert.doesNotMatch(front, /フィードバックを送信/);
  assert.match(front, /response\.ok && data\.ok && data\.available/);
  assert.match(front, /appearance: "interaction-only"/);
});
