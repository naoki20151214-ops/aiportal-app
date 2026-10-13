import { validateFeedbackSubmission } from "../../src/lib/article-feedback-schema";
import { publishedArticleSlugById } from "../../src/generated/published-article-slugs";

type D1RunResult = { success: boolean; meta?: { changes?: number } };
type FeedbackDatabase = {
  prepare(query: string): {
    first(): Promise<Record<string, unknown> | null>;
    bind(...values: (string | null)[]): { run(): Promise<D1RunResult> };
  };
};
type FeedbackEnvironment = {
  AI_PORTAL_FEEDBACK_ENABLED?: string;
  AI_PORTAL_FEEDBACK_DB?: FeedbackDatabase;
  TURNSTILE_SECRET_KEY?: string;
};
type FeedbackContext = { request: Request; env: FeedbackEnvironment };

const json = (status: number, result: Record<string, unknown>) =>
  Response.json(result, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });

// All access is uncredentialed reader feedback, but never unverified: origin,
// article allowlist, schema, Turnstile and external WAF rate limits apply.
// An in-memory per-page UUID is the vote's opaque receipt. Repeating a POST
// with the same UUID is idempotent; PATCH changes that existing vote only.
export const onRequest = async ({ request, env }: FeedbackContext): Promise<Response> => {
  if (request.method !== "GET" && request.method !== "POST" && request.method !== "PATCH")
    return json(405, { ok: false, error: "method_not_allowed" });
  if (env.AI_PORTAL_FEEDBACK_ENABLED !== "1" || !env.AI_PORTAL_FEEDBACK_DB || !env.TURNSTILE_SECRET_KEY)
    return json(503, { ok: false, error: "feedback_unavailable" });
  // Only show active vote buttons when bindings AND the migration exist.
  // SELECT succeeds even with zero submissions. Do not expose stored content.
  if (request.method === "GET") {
    try {
      await env.AI_PORTAL_FEEDBACK_DB.prepare("SELECT 1 AS ready FROM article_feedback LIMIT 1").first();
      return json(200, { ok: true, available: true });
    } catch {
      return json(503, { ok: false, error: "storage_unavailable" });
    }
  }

  const url = new URL(request.url);
  if (request.headers.get("Origin") !== url.origin)
    return json(403, { ok: false, error: "origin_rejected" });
  if (!(request.headers.get("Content-Type") || "").toLowerCase().startsWith("application/json"))
    return json(415, { ok: false, error: "json_required" });

  let source: unknown;
  try {
    const text = await request.text();
    if (text.length > 6000) return json(413, { ok: false, error: "payload_too_large" });
    source = JSON.parse(text);
  } catch {
    return json(400, { ok: false, error: "invalid_json" });
  }

  const parsed = validateFeedbackSubmission(source);
  if (!parsed.ok) return json(422, { ok: false, error: parsed.error });
  const input = parsed.value;
  if (publishedArticleSlugById[input.articleId as keyof typeof publishedArticleSlugById] !== input.slug)
    return json(422, { ok: false, error: "article_not_published" });
  if (request.method === "PATCH" && input.kind !== "rating")
    return json(422, { ok: false, error: "only_rating_can_be_updated" });

  let verified: { success?: boolean; hostname?: string; action?: string };
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET_KEY,
        response: input.turnstileToken,
      }),
      signal: AbortSignal.timeout(7500),
    });
    if (!response.ok) return json(502, { ok: false, error: "verification_unavailable" });
    verified = await response.json() as typeof verified;
  } catch {
    return json(502, { ok: false, error: "verification_unavailable" });
  }
  if (verified.success !== true || verified.hostname !== url.hostname || verified.action !== "article_feedback")
    return json(403, { ok: false, error: "verification_rejected" });

  try {
    const db = env.AI_PORTAL_FEEDBACK_DB;
    if (request.method === "PATCH") {
      const updated = await db.prepare(
        "UPDATE article_feedback SET rating = ?, reason = ?, note = '' WHERE id = ? AND article_id = ? AND slug = ? AND revision = ? AND kind = 'rating'"
      ).bind(input.rating, input.reason, input.requestId, input.articleId, input.slug, input.revision).run();
      if (updated.success !== true) throw new Error("D1 update failed");
      if (!updated.meta?.changes) return json(404, { ok: false, error: "receipt_not_found" });
      return json(200, { ok: true, receipt: input.requestId });
    }

    // SQLite upsert prevents a duplicate vote after a timeout/retry and binds
    // the receipt to the original article and feedback kind, never another row.
    const inserted = await db.prepare(
      "INSERT INTO article_feedback (id, article_id, slug, revision, kind, rating, reason, note) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET " +
      "rating = excluded.rating, reason = excluded.reason, note = excluded.note " +
      "WHERE article_feedback.article_id = excluded.article_id " +
      "AND article_feedback.slug = excluded.slug " +
      "AND article_feedback.revision = excluded.revision " +
      "AND article_feedback.kind = excluded.kind"
    ).bind(input.requestId, input.articleId, input.slug, input.revision, input.kind, input.rating, input.reason, input.note).run();
    if (inserted.success !== true) throw new Error("D1 insert failed");
    if (!inserted.meta?.changes) return json(409, { ok: false, error: "receipt_conflict" });
    return json(201, { ok: true, receipt: input.requestId });
  } catch {
    return json(503, { ok: false, error: "storage_unavailable" });
  }
};
