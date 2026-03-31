CREATE TABLE narrator_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  turn_sequence BIGINT NOT NULL,
  prose TEXT NOT NULL,
  source TEXT NOT NULL,
  contributing_actor_ids JSONB NOT NULL,
  spoke_event_ids JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT narrator_messages_session_turn_unique UNIQUE(session_id, turn_sequence)
);

CREATE INDEX idx_narrator_messages_session_turn
  ON narrator_messages(session_id, turn_sequence);
