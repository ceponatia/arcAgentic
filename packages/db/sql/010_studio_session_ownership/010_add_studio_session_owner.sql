-- Bridge the historical runtime DDL for studio sessions into the legacy SQL
-- migration chain so fresh databases no longer depend on application startup.

CREATE TABLE IF NOT EXISTS studio_sessions (
	id TEXT PRIMARY KEY,
	owner_email TEXT NOT NULL DEFAULT 'local',
	profile_snapshot JSONB NOT NULL,
	conversation JSONB NOT NULL DEFAULT '[]'::jsonb,
	summary TEXT,
	inferred_traits JSONB NOT NULL DEFAULT '[]'::jsonb,
	explored_topics JSONB NOT NULL DEFAULT '[]'::jsonb,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_studio_sessions_expires_at ON studio_sessions(expires_at);

ALTER TABLE studio_sessions
ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL DEFAULT 'local';
