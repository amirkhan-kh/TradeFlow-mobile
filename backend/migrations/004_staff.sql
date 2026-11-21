ALTER TABLE users
  ADD COLUMN email TEXT CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ADD COLUMN last_login_at TIMESTAMPTZ,
  ADD COLUMN password_changed_at TIMESTAMPTZ,
  ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX users_email_key ON users (lower(email)) WHERE email IS NOT NULL;

CREATE TABLE activity_log (
  id             BIGSERIAL PRIMARY KEY,
  actor_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action         TEXT NOT NULL,
  target_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  details        JSONB NOT NULL DEFAULT '{}',
  ip             TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_log_created_idx ON activity_log (created_at DESC);
CREATE INDEX activity_log_actor_idx ON activity_log (actor_id, created_at DESC);
CREATE INDEX activity_log_target_idx ON activity_log (target_user_id, created_at DESC);
