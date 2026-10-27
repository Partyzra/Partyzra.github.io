-- RUN ONCE against your existing partyzra-analytics-db in Cloudflare D1 Console.
-- Preserves all existing rows, timestamps, and indexes.
ALTER TABLE events ADD COLUMN visitor_id TEXT;
CREATE INDEX IF NOT EXISTS idx_events_visitor_created_at
  ON events(visitor_id, created_at) WHERE visitor_id IS NOT NULL;
