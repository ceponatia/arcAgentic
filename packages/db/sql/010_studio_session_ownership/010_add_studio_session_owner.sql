ALTER TABLE studio_sessions
ADD COLUMN IF NOT EXISTS owner_email TEXT NOT NULL DEFAULT 'local';
