export type FeedbackKind = "rating" | "correction";
export type FeedbackRating = "understood" | "partly" | "difficult";
export type FeedbackReason = "hard-text" | "hard-visuals" | "need-examples" | "jargon" | "other";

export type ArticleFeedbackSubmission = {
  articleId: string;
  slug: string;
  revision: string;
  kind: FeedbackKind;
  rating: FeedbackRating | null;
  reason: FeedbackReason | null;
  note: string;
  turnstileToken: string;
};
export type ValidationResult =
  | { ok: true; value: ArticleFeedbackSubmission }
  | { ok: false; error: string };

const ID = /^(BAS|GEN|AGT|PHY|INF|SOC|NEWS)-\d{4}$/;
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const REASONS = new Set<FeedbackReason>(["hard-text", "hard-visuals", "need-examples", "jargon", "other"]);
const RATINGS = new Set<FeedbackRating>(["understood", "partly", "difficult"]);
const FIELDS = new Set(["articleId", "slug", "revision", "kind", "rating", "reason", "note", "turnstileToken"]);

export function validateFeedbackSubmission(input: unknown): ValidationResult {
  const bad = (error: string): ValidationResult => ({ ok: false, error });
  if (!input || typeof input !== "object" || Array.isArray(input)) return bad("invalid_body");
  const row = input as Record<string, unknown>;
  if (Object.keys(row).some((key) => !FIELDS.has(key))) return bad("unknown_field");
  if (typeof row.articleId !== "string" || !ID.test(row.articleId)) return bad("invalid_article_id");
  if (typeof row.slug !== "string" || row.slug.length > 120 || !SLUG.test(row.slug)) return bad("invalid_slug");
  if (typeof row.revision !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(row.revision)) return bad("invalid_revision");
  const date = new Date(row.revision + "T00:00:00Z");
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== row.revision) return bad("invalid_revision");
  if (row.kind !== "rating" && row.kind !== "correction") return bad("invalid_kind");
  const kind = row.kind;
  if (typeof row.turnstileToken !== "string" || row.turnstileToken.length < 1 || row.turnstileToken.length > 2048)
    return bad("invalid_challenge_token");
  const rating = row.rating === undefined || row.rating === null ? null : row.rating;
  const reason = row.reason === undefined || row.reason === null ? null : row.reason;
  const note = row.note === undefined || row.note === null ? "" : row.note;
  if (rating !== null && (typeof rating !== "string" || !RATINGS.has(rating as FeedbackRating)))
    return bad("invalid_rating");
  if (reason !== null && (typeof reason !== "string" || !REASONS.has(reason as FeedbackReason)))
    return bad("invalid_reason");
  if (typeof note !== "string" || note.length > 500 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(note))
    return bad("invalid_note");
  const trimmed = note.trim();
  if (kind === "rating") {
    if (!rating) return bad("rating_required");
    if (rating === "understood" && reason) return bad("unexpected_reason");
  } else if (rating !== null || reason !== null || trimmed.length < 8) {
    return bad("correction_details_required");
  }
  return {
    ok: true,
    value: {
      articleId: row.articleId,
      slug: row.slug,
      revision: row.revision,
      kind,
      rating: rating as FeedbackRating | null,
      reason: reason as FeedbackReason | null,
      note: trimmed,
      turnstileToken: row.turnstileToken,
    },
  };
}
