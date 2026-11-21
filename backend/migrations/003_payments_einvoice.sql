ALTER TABLE payments DROP CONSTRAINT payments_method_check;
ALTER TABLE payments ADD CONSTRAINT payments_method_check CHECK (method IN ('cash','card','transfer','payme','click'));

ALTER TABLE clients ADD COLUMN inn TEXT CHECK (inn ~ '^[0-9]{9}$|^[0-9]{14}$');

ALTER TABLE products
  ADD COLUMN ikpu TEXT CHECK (ikpu ~ '^[0-9]{17}$'),
  ADD COLUMN package_code TEXT,
  ADD COLUMN vat_rate NUMERIC(5,2) NOT NULL DEFAULT 12 CHECK (vat_rate >= 0 AND vat_rate <= 100);

CREATE TABLE payment_transactions (
  id             SERIAL PRIMARY KEY,
  integration_id INTEGER REFERENCES integrations(id) ON DELETE SET NULL,
  provider       TEXT NOT NULL CHECK (provider IN ('payme','click')),
  external_id    TEXT NOT NULL,
  client_id      INTEGER NOT NULL REFERENCES clients(id),
  order_id       INTEGER REFERENCES orders(id),
  amount         NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  state          INTEGER NOT NULL,
  reason         INTEGER,
  payment_id     INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  create_time    BIGINT NOT NULL,
  perform_time   BIGINT NOT NULL DEFAULT 0,
  cancel_time    BIGINT NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);
CREATE INDEX payment_transactions_time_idx ON payment_transactions (provider, create_time);
