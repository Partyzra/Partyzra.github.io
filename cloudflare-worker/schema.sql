CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  page TEXT,
  item TEXT,
  label TEXT,
  referrer TEXT,
  session_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_events_created_at
  ON events(created_at);

CREATE INDEX IF NOT EXISTS idx_events_type_created_at
  ON events(event_type, created_at);

CREATE INDEX IF NOT EXISTS idx_events_item
  ON events(item);

CREATE INDEX IF NOT EXISTS idx_events_session
  ON events(session_id);
