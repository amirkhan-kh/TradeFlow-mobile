-- Indexes for large datasets: foreign keys used in joins, list filters, time-ordered feeds,
-- and trigram indexes so `ILIKE '%q%'` search stays fast with thousands of rows.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS order_items_order_idx ON order_items (order_id);
CREATE INDEX IF NOT EXISTS order_items_product_idx ON order_items (product_id);
CREATE INDEX IF NOT EXISTS orders_status_created_idx ON orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_agent_created_idx ON orders (agent_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_warehouse_idx ON orders (warehouse_id);

CREATE INDEX IF NOT EXISTS payments_client_created_idx ON payments (client_id, created_at DESC);
CREATE INDEX IF NOT EXISTS payments_created_idx ON payments (created_at DESC);
CREATE INDEX IF NOT EXISTS payments_order_idx ON payments (order_id);

CREATE INDEX IF NOT EXISTS deliveries_status_idx ON deliveries (status, scheduled_at DESC);
CREATE INDEX IF NOT EXISTS deliveries_courier_idx ON deliveries (courier_id);

CREATE INDEX IF NOT EXISTS stock_product_idx ON stock (product_id);
CREATE INDEX IF NOT EXISTS stock_movements_product_idx ON stock_movements (product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_warehouse_idx ON stock_movements (warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stock_movements_type_created_idx ON stock_movements (type, created_at DESC);

CREATE INDEX IF NOT EXISTS clients_agent_idx ON clients (agent_id);
CREATE INDEX IF NOT EXISTS clients_name_trgm ON clients USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS clients_phone_trgm ON clients USING gin (phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS products_name_trgm ON products USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_sku_trgm ON products USING gin (sku gin_trgm_ops);
CREATE INDEX IF NOT EXISTS products_category_idx ON products (category);

CREATE INDEX IF NOT EXISTS orders_number_trgm ON orders USING gin (number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);
CREATE INDEX IF NOT EXISTS audits_warehouse_idx ON audits (warehouse_id, created_at DESC);
CREATE INDEX IF NOT EXISTS audit_items_product_idx ON audit_items (product_id);
CREATE INDEX IF NOT EXISTS leads_status_created_idx ON leads (status, created_at DESC);
