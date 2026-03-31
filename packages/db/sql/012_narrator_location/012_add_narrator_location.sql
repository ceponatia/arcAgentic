ALTER TABLE narrator_messages ADD COLUMN location_id TEXT;

CREATE INDEX idx_narrator_messages_session_location
  ON narrator_messages (session_id, location_id);