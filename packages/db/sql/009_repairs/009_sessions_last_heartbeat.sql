-- Repair older databases that were created from pre-consolidation session schema.
-- Current runtime code reads sessions.last_heartbeat_at, so make the column additive.

ALTER TABLE sessions
ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;
