-- Optional reader comments, separate from article-feedback ratings and GA4.
-- No names, emails, IP addresses, user accounts, or device identifiers.
-- Deploy this migration to the production D1 binding before enabling comments.
CREATE TABLE IF NOT EXISTS reader_comments (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL,
  prompt_code TEXT NOT NULL CHECK (prompt_code IN ('helpful_part', 'confusing_part', 'practical_use', 'next_question')),
  note TEXT NOT NULL CHECK (length(note) BETWEEN 8 AND 300),
  received_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_reader_comments_article_date ON reader_comments(slug, received_at);
