CREATE TABLE integrations (
  id           SERIAL PRIMARY KEY,
  provider     TEXT NOT NULL,
  name         TEXT NOT NULL,
  config       JSONB NOT NULL DEFAULT '{}',
  events       TEXT[] NOT NULL DEFAULT '{}',
  token        TEXT NOT NULL UNIQUE,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_error   TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE integration_jobs (
  id             SERIAL PRIMARY KEY,
  integration_id INTEGER NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  event          TEXT NOT NULL,
  payload        JSONB NOT NULL,
  status         TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','done','failed')),
  attempts       INTEGER NOT NULL DEFAULT 0,
  next_run_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_error     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  done_at        TIMESTAMPTZ
);
CREATE INDEX integration_jobs_due_idx ON integration_jobs (next_run_at) WHERE status = 'pending';
CREATE INDEX integration_jobs_integration_idx ON integration_jobs (integration_id, created_at DESC);

CREATE TABLE integration_links (
  integration_id INTEGER NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  entity         TEXT NOT NULL,
  entity_id      INTEGER NOT NULL,
  external_id    TEXT NOT NULL,
  PRIMARY KEY (integration_id, entity, entity_id)
);

CREATE TABLE calls (
  id             SERIAL PRIMARY KEY,
  integration_id INTEGER REFERENCES integrations(id) ON DELETE SET NULL,
  external_id    TEXT,
  direction      TEXT NOT NULL CHECK (direction IN ('in','out')),
  status         TEXT NOT NULL CHECK (status IN ('answered','missed')),
  phone          TEXT NOT NULL,
  client_id      INTEGER REFERENCES clients(id),
  lead_id        INTEGER REFERENCES leads(id),
  duration_sec   INTEGER NOT NULL DEFAULT 0 CHECK (duration_sec >= 0),
  recording_url  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (integration_id, external_id)
);
CREATE INDEX calls_client_idx ON calls (client_id, created_at DESC);
