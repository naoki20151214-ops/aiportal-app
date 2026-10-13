-- Reader feedback. No names, emails, IP addresses, device identifiers or
-- advertising identifiers are collected by this schema.
CREATE TABLE IF NOT EXISTS article_feedback (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  revision TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('rating', 'correction')),
  rating TEXT CHECK (rating IS NULL OR rating IN ('understood', 'partly', 'difficult')),
  reason TEXT CHECK (reason IS NULL OR reason IN ('hard-text', 'hard-visuals', 'need-examples', 'jargon', 'other')),
  note TEXT NOT NULL DEFAULT '' CHECK (length(note) <= 500),
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_article_feedback_article_date
  ON article_feedback(article_id, received_at);
CREATE INDEX IF NOT EXISTS idx_article_feedback_kind_date
  ON article_feedback(kind, received_at);
