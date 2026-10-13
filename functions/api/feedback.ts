import { validateFeedbackSubmission } from "../../src/lib/article-feedback-schema";
import { publishedArticleSlugById } from "../../src/generated/published-article-slugs";

type D1RunResult = { success: boolean };
type FeedbackDatabase = {
  prepare(query: string): {
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

// Cloudflare Pages Function: no secrets, site keys or database identifiers are
// ever sent back to callers. Never persist unverified or unbounded submissions.
export const onRequest = async ({ request, env }: FeedbackContext): Promise<Response> => {
  if (request.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });
  if (env.AI_PORTAL_FEEDBACK_ENABLED !== "1" || !env.AI_PORTAL_FEEDBACK_DB || !env.TURNSTILE_SECRET_KEY)
    return json(503, { ok: false, error: "feedback_unavailable" });

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
    const id = crypto.randomUUID();
    const inserted = await env.AI_PORTAL_FEEDBACK_DB.prepare(
      "INSERT INTO article_feedback (id, article_id, slug, revision, kind, rating, reason, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
    ).bind(id, input.articleId, input.slug, input.revision, input.kind, input.rating, input.reason, input.note).run();
    if (inserted.success !== true) throw new Error("D1 write was not successful");
    return json(201, { ok: true, receipt: id });
  } catch {
    // Do not claim to have received a report unless D1 actually persisted it.
    return json(503, { ok: false, error: "storage_unavailable" });
  }
};
