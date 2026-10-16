-- Keep the daily 180-day retention sweep efficient without touching other tables.
CREATE INDEX IF NOT EXISTS idx_reader_comments_received_at ON reader_comments(received_at);
