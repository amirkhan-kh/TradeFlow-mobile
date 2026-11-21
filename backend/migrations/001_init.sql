CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  username      TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('admin','manager','agent','courier','auditor')),
  phone         TEXT,
  region        TEXT,
  monthly_plan  NUMERIC(14,2) NOT NULL DEFAULT 0,
  active        BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE warehouses (
  id           SERIAL PRIMARY KEY,
  code         TEXT NOT NULL UNIQUE,
  name         TEXT NOT NULL,
  city         TEXT NOT NULL,
  address      TEXT,
  capacity     INTEGER NOT NULL DEFAULT 0,
  manager_name TEXT,
  active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id         SERIAL PRIMARY KEY,
  sku        TEXT NOT NULL UNIQUE,
  name       TEXT NOT NULL,
  category   TEXT NOT NULL,
  unit       TEXT NOT NULL DEFAULT 'dona',
  weight_kg  NUMERIC(10,3) NOT NULL DEFAULT 0,
  price      NUMERIC(14,2) NOT NULL CHECK (price >= 0),
  cost       NUMERIC(14,2) NOT NULL DEFAULT 0,
  min_stock  INTEGER NOT NULL DEFAULT 0,
  expires_at DATE,
  active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE stock (
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  product_id   INTEGER NOT NULL REFERENCES products(id),
  quantity     INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved     INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  PRIMARY KEY (warehouse_id, product_id),
  CHECK (reserved <= quantity)
);

CREATE TABLE stock_movements (
  id              SERIAL PRIMARY KEY,
  type            TEXT NOT NULL CHECK (type IN ('in','out','transfer','adjust')),
  warehouse_id    INTEGER NOT NULL REFERENCES warehouses(id),
  to_warehouse_id INTEGER REFERENCES warehouses(id),
  product_id      INTEGER NOT NULL REFERENCES products(id),
  quantity        INTEGER NOT NULL,
  reference       TEXT,
  note            TEXT,
  user_id         INTEGER REFERENCES users(id),
  idempotency_key TEXT UNIQUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX stock_movements_created_idx ON stock_movements (created_at);

CREATE TABLE clients (
  id           SERIAL PRIMARY KEY,
  name         TEXT NOT NULL,
  owner_name   TEXT,
  phone        TEXT,
  region       TEXT NOT NULL,
  address      TEXT,
  segment      TEXT NOT NULL DEFAULT 'B' CHECK (segment IN ('A','B','C')),
  agent_id     INTEGER REFERENCES users(id),
  credit_limit NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance      NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id           SERIAL PRIMARY KEY,
  number       TEXT NOT NULL UNIQUE,
  client_id    INTEGER NOT NULL REFERENCES clients(id),
  agent_id     INTEGER REFERENCES users(id),
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  status       TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','confirmed','shipped','delivered','cancelled')),
  subtotal     NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0,
  total        NUMERIC(14,2) NOT NULL DEFAULT 0,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_created_idx ON orders (created_at);
CREATE INDEX orders_client_idx ON orders (client_id);

CREATE TABLE order_items (
  id         SERIAL PRIMARY KEY,
  order_id   INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity   INTEGER NOT NULL CHECK (quantity > 0),
  price      NUMERIC(14,2) NOT NULL
);

CREATE TABLE deliveries (
  id           SERIAL PRIMARY KEY,
  order_id     INTEGER NOT NULL UNIQUE REFERENCES orders(id),
  courier_id   INTEGER REFERENCES users(id),
  vehicle      TEXT,
  status       TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','on_route','delivered','failed')),
  scheduled_at DATE NOT NULL DEFAULT CURRENT_DATE,
  delivered_at TIMESTAMPTZ,
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id         SERIAL PRIMARY KEY,
  client_id  INTEGER NOT NULL REFERENCES clients(id),
  order_id   INTEGER REFERENCES orders(id),
  amount     NUMERIC(14,2) NOT NULL CHECK (amount > 0),
  method     TEXT NOT NULL CHECK (method IN ('cash','card','transfer')),
  note       TEXT,
  user_id    INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audits (
  id           SERIAL PRIMARY KEY,
  number       TEXT NOT NULL UNIQUE,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id),
  auditor_id   INTEGER REFERENCES users(id),
  status       TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress','completed','approved')),
  note         TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  approved_at  TIMESTAMPTZ
);

CREATE TABLE audit_items (
  id         SERIAL PRIMARY KEY,
  audit_id   INTEGER NOT NULL REFERENCES audits(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  expected   INTEGER NOT NULL,
  counted    INTEGER,
  UNIQUE (audit_id, product_id)
);

CREATE TABLE leads (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  company    TEXT,
  message    TEXT,
  status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','contacted','won','lost')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
