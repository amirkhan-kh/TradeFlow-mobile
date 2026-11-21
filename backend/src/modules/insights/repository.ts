import { pool } from "../../core/db.js";

const rows = async <T>(sql: string) => (await pool.query(sql)).rows as T[];

export const stockCover = () =>
  rows<{ product_id: number; name: string; warehouse_name: string; available: number; daily: number }>(`
    WITH o AS (
      SELECT product_id, warehouse_id, SUM(quantity) AS out_30 FROM stock_movements
      WHERE type = 'out' AND created_at >= now() - interval '30 days'
      GROUP BY product_id, warehouse_id HAVING SUM(quantity) > 0
    )
    SELECT p.id AS product_id, p.name, w.name AS warehouse_name, (s.quantity - s.reserved) AS available,
      o.out_30 / 30.0 AS daily
    FROM o JOIN stock s ON s.product_id = o.product_id AND s.warehouse_id = o.warehouse_id
    JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id`);

export const expiring = () =>
  rows<{ name: string; expires_at: string; units: number }>(`
    SELECT p.name, p.expires_at, SUM(s.quantity)::int AS units
    FROM products p JOIN stock s ON s.product_id = p.id
    WHERE p.expires_at IS NOT NULL AND p.expires_at <= current_date + 45 AND s.quantity > 0
    GROUP BY p.id ORDER BY p.expires_at LIMIT 5`);

export const overlimit = () =>
  rows<{ id: number; name: string; balance: number; credit_limit: number }>(`
    SELECT id, name, balance, credit_limit FROM clients
    WHERE credit_limit > 0 AND balance > credit_limit ORDER BY balance - credit_limit DESC LIMIT 5`);

export const collection = async () =>
  (
    await rows<{ sold: number; collected: number }>(`
    SELECT
      (SELECT COALESCE(SUM(total),0) FROM orders WHERE status IN ('shipped','delivered') AND created_at >= now() - interval '30 days') AS sold,
      (SELECT COALESCE(SUM(amount),0) FROM payments WHERE created_at >= now() - interval '30 days') AS collected`)
  )[0];

export const staleWarehouses = () =>
  rows<{ id: number; name: string; last_audit: string | null }>(`
    SELECT w.id, w.name, MAX(a.created_at) AS last_audit
    FROM warehouses w LEFT JOIN audits a ON a.warehouse_id = w.id
    WHERE w.active GROUP BY w.id
    HAVING MAX(a.created_at) IS NULL OR MAX(a.created_at) < now() - interval '30 days'`);

export const auditVariance = () =>
  rows<{ id: number; number: string; warehouse_name: string; variance: number }>(`
    SELECT a.id, a.number, w.name AS warehouse_name,
      SUM((i.counted - i.expected) * p.cost) AS variance
    FROM audits a JOIN warehouses w ON w.id = a.warehouse_id
    JOIN audit_items i ON i.audit_id = a.id JOIN products p ON p.id = i.product_id
    WHERE i.counted IS NOT NULL AND a.created_at >= now() - interval '60 days'
    GROUP BY a.id, w.name HAVING ABS(SUM((i.counted - i.expected) * p.cost)) > 0
    ORDER BY ABS(SUM((i.counted - i.expected) * p.cost)) DESC LIMIT 3`);

export const dormantClients = () =>
  rows<{ id: number; name: string; last_order: string; agent_name: string | null }>(`
    SELECT c.id, c.name, MAX(o.created_at) AS last_order, u.full_name AS agent_name
    FROM clients c JOIN orders o ON o.client_id = c.id LEFT JOIN users u ON u.id = c.agent_id
    GROUP BY c.id, u.full_name HAVING MAX(o.created_at) < now() - interval '21 days'
    ORDER BY MAX(o.created_at) LIMIT 5`);

export const agentPace = () =>
  rows<{ full_name: string; plan: number; revenue: number }>(`
    SELECT u.full_name, u.monthly_plan AS plan,
      COALESCE((SELECT SUM(total) FROM orders o WHERE o.agent_id = u.id AND o.status IN ('shipped','delivered')
        AND o.created_at >= date_trunc('month', now())), 0) AS revenue
    FROM users u WHERE u.role = 'agent' AND u.active AND u.monthly_plan > 0`);

export const monthlyRevenue = () =>
  rows<{ revenue: number }>(`
    SELECT COALESCE(SUM(o.total), 0) AS revenue
    FROM generate_series(date_trunc('month', now()) - interval '6 months', date_trunc('month', now()) - interval '1 month', interval '1 month') m
    LEFT JOIN orders o ON date_trunc('month', o.created_at) = m AND o.status IN ('shipped','delivered')
    GROUP BY m ORDER BY m`);

export const lateDeliveries = () =>
  rows<{ count: number; failed: number }>(`
    SELECT COUNT(*) FILTER (WHERE status IN ('pending','on_route') AND scheduled_at < current_date) AS count,
           COUNT(*) FILTER (WHERE status = 'failed') AS failed
    FROM deliveries`);
