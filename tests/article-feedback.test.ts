import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { parse } from "yaml";
import { validateFeedbackSubmission } from "../src/lib/article-feedback-schema";
import { publishedArticleSlugById } from "../src/generated/published-article-slugs";
import { onRequest } from "../functions/api/feedback";

const articleId = "BAS-0032";
const slug = "symbolic-ai";
const sample = {
  articleId,
  slug,
  revision: "2026-10-13",
  kind: "rating",
  rating: "partly",
  reason: "jargon",
  note: "専門用語をもう少し説明してほしい",
  turnstileToken: "test-token",
};

const submit = (body: unknown, options?: { origin?: string; contentType?: string }) =>
  new Request("https://aiportal.blog/api/feedback", {
    method: "POST",
    headers: {
      Origin: options?.origin ?? "https://aiportal.blog",
      "Content-Type": options?.contentType ?? "application/json",
    },
    body: JSON.stringify(body),
  });

function database() {
  const submissions: Array<(string | null)[]> = [];
  return {
    submissions,
    handle: {
      prepare(sql: string) {
        assert.match(sql, /^INSERT INTO article_feedback \(/);
        return {
          bind(...values: (string | null)[]) {
            return {
              async run() {
                submissions.push(values);
                return { success: true };
              },
            };
          },
        };
      },
    },
  };
}

test("feedback validation rejects malformed, oversized, extra and inconsistent fields", () => {
  for (const [payload, expected] of [
    [null, "invalid_body"],
    [{ ...sample, articleId: "abc" }, "invalid_article_id"],
    [{ ...sample, slug: "../admin" }, "invalid_slug"],
    [{ ...sample, revision: "2026-02-30" }, "invalid_revision"],
    [{ ...sample, rating: "perfect" }, "invalid_rating"],
    [{ ...sample, reason: "undefined" }, "invalid_reason"],
    [{ ...sample, spam: true }, "unknown_field"],
    [{ ...sample, note: "x".repeat(501) }, "invalid_note"],
    [{ ...sample, rating: "understood", reason: "jargon" }, "unexpected_reason"],
    [{ ...sample, kind: "correction", rating: null, reason: null, note: "短い" }, "correction_details_required"],
    [{ ...sample, turnstileToken: "" }, "invalid_challenge_token"],
  ] as const) {
    const response = validateFeedbackSubmission(payload);
    assert.equal(response.ok, false);
    if (!response.ok) assert.equal(response.error, expected);
  }
  assert.equal(validateFeedbackSubmission(sample).ok, true);
  const validCorrection = { ...sample, kind: "correction", rating: null, reason: null, note: "第4節の説明と公式出典の定義が異なります" };
  assert.equal(validateFeedbackSubmission(validCorrection).ok, true);
});

test("generated allowlist exactly matches currently published article Registry nodes", () => {
  const registry = parse(readFileSync("content/registry/knowledge-nodes.yml", "utf8"));
  const expected = Object.fromEntries(registry.nodes
    .filter((node: {status: string}) => node.status === "published")
    .map((node: {id: string; slug: string}) => [node.id, node.slug]));
  assert.deepEqual(publishedArticleSlugById, expected);
});

test("feedback endpoint is unavailable unless both explicit flag and D1/Turnstile are configured", async () => {
  const x = await onRequest({ request: submit(sample), env: {} });
  assert.equal(x.status, 503);
  const body = await x.json() as {ok: boolean; error: string};
  assert.equal(body.ok, false);
  assert.equal(body.error, "feedback_unavailable");
});

test("feedback endpoint rejects invalid Origin, content type, non-POST and unknown published articles", async () => {
  const db = database();
  const env = { AI_PORTAL_FEEDBACK_ENABLED: "1", AI_PORTAL_FEEDBACK_DB: db.handle, TURNSTILE_SECRET_KEY: "secret" };
  const wrongOrigin = await onRequest({ request: submit(sample, { origin: "https://other.example" }), env });
  assert.equal(wrongOrigin.status, 403);
  const wrongType = await onRequest({ request: submit(sample, { contentType: "text/plain" }), env });
  assert.equal(wrongType.status, 415);
  const wrongId = await onRequest({ request: submit({ ...sample, articleId: "BAS-9999" }), env });
  assert.equal(wrongId.status, 422);
  const wrongSlug = await onRequest({ request: submit({ ...sample, slug: "other-topic" }), env });
  assert.equal(wrongSlug.status, 422);
  const get = await onRequest({ request: new Request("https://aiportal.blog/api/feedback"), env });
  assert.equal(get.status, 405);
  assert.equal(db.submissions.length, 0);
});

test("server verifies Turnstile action and hostname before persisting a rating", async () => {
  const db = database();
  const env = { AI_PORTAL_FEEDBACK_ENABLED: "1", AI_PORTAL_FEEDBACK_DB: db.handle, TURNSTILE_SECRET_KEY: "secret" };
  const originalFetch = globalThis.fetch;
  let verified = false;
  globalThis.fetch = (async (url: string | URL | Request, options?: RequestInit) => {
    assert.equal(String(url), "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    assert.equal(options?.method, "POST");
    assert.match(String(options?.body), /secret=secret/);
    verified = true;
    return Response.json({ success: true, hostname: "aiportal.blog", action: "article_feedback" });
  }) as typeof fetch;
  try {
    const result = await onRequest({ request: submit(sample), env });
    assert.equal(result.status, 201);
    assert.equal((await result.json() as {ok: boolean}).ok, true);
    assert.equal(result.headers.get("Cache-Control"), "no-store");
    assert.equal(verified, true);
    assert.equal(db.submissions.length, 1);
    assert.deepEqual(db.submissions[0].slice(1), [
      sample.articleId, sample.slug, sample.revision, sample.kind, sample.rating, sample.reason, sample.note,
    ]);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Turnstile failure or mismatched hostname never writes to database", async () => {
  const db = database();
  const env = { AI_PORTAL_FEEDBACK_ENABLED: "1", AI_PORTAL_FEEDBACK_DB: db.handle, TURNSTILE_SECRET_KEY: "secret" };
  const originalFetch = globalThis.fetch;
  try {
    for (const result of [
      { success: false, hostname: "aiportal.blog", action: "article_feedback" },
      { success: true, hostname: "elsewhere.example", action: "article_feedback" },
      { success: true, hostname: "aiportal.blog", action: "login" },
    ]) {
      globalThis.fetch = (async () => Response.json(result)) as typeof fetch;
      const response = await onRequest({ request: submit(sample), env });
      assert.equal(response.status, 403);
    }
    assert.equal(db.submissions.length, 0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("D1 storage error never acknowledges a successfully received report", async () => {
  const env = {
    AI_PORTAL_FEEDBACK_ENABLED: "1",
    TURNSTILE_SECRET_KEY: "secret",
    AI_PORTAL_FEEDBACK_DB: {
      prepare(_sql: string) {
        return { bind(..._args: (string | null)[]) {
          return { async run(): Promise<{success: boolean}> { throw new Error("D1 missing migration"); } };
        } };
      },
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({
    success: true, hostname: "aiportal.blog", action: "article_feedback",
  })) as typeof fetch;
  try {
    const result = await onRequest({ request: submit(sample), env });
    assert.equal(result.status, 503);
    assert.equal((await result.json() as {ok: boolean}).ok, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("Pages Functions route invokes only API and never intercepts static articles", () => {
  const routes = JSON.parse(readFileSync("public/_routes.json", "utf8"));
  assert.deepEqual(routes, { version: 1, include: ["/api/feedback"], exclude: [] });
  const front = readFileSync("src/components/article-feedback.tsx", "utf8");
  assert.match(front, /NEXT_PUBLIC_ARTICLE_FEEDBACK_ENABLED/);
  assert.match(front, /お問い合わせフォームから送る/);
});
