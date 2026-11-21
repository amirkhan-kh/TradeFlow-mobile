import { Router } from "express";
import { pool } from "../../core/db.js";

const SOLD = `o.status IN ('shipped','delivered')`;
const q = async (sql: string) => (await pool.query(sql)).rows;

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res) => {
  const [kpi, flow, sales, daily, topProducts, regions, statuses, categories, audits, lowStock, recentOrders] =
    await Promise.all([
      q(`SELECT
        (SELECT COALESCE(SUM(total),0) FROM orders o WHERE ${SOLD} AND created_at >= date_trunc('month', now())) AS revenue_month,
        (SELECT COALESCE(SUM(total),0) FROM orders o WHERE ${SOLD} AND created_at >= date_trunc('month', now()) - interval '1 month'
            AND created_at < now() - interval '1 month') AS revenue_prev_same_period,
        (SELECT COUNT(*) FROM orders WHERE created_at >= date_trunc('month', now())) AS orders_month,
        (SELECT COUNT(*) FROM orders WHERE created_at >= date_trunc('day', now())) AS orders_today,
        (SELECT COUNT(*) FROM warehouses WHERE active) AS active_warehouses,
        (SELECT COALESCE(SUM(m.quantity * p.weight_kg),0) / 1000 FROM stock_movements m JOIN products p ON p.id = m.product_id
            WHERE m.type = 'out' AND m.created_at >= date_trunc('month', now())) AS shipped_tons_month,
        (SELECT COALESCE(SUM(balance),0) FROM clients WHERE balance > 0) AS receivables,
        (SELECT COUNT(*) FROM clients WHERE balance > credit_limit AND credit_limit > 0) AS overlimit_clients,
        (SELECT COUNT(*) FROM audits WHERE status <> 'approved') AS active_audits,
        (SELECT COUNT(*) FROM stock s JOIN products p ON p.id = s.product_id WHERE s.quantity - s.reserved <= p.min_stock) AS low_stock,
        (SELECT COALESCE(SUM(s.quantity * p.cost),0) FROM stock s JOIN products p ON p.id = s.product_id) AS stock_value,
        (SELECT COUNT(*) FROM clients) AS clients,
        (SELECT COUNT(*) FROM deliveries WHERE status IN ('pending','on_route')) AS active_deliveries,
        (SELECT COALESCE(SUM(amount),0) FROM payments WHERE created_at >= date_trunc('month', now())) AS collected_month`),
      q(`WITH agg AS (
          SELECT date_trunc('month', created_at) AS m,
            SUM(quantity) FILTER (WHERE type = 'in') AS inbound, SUM(quantity) FILTER (WHERE type = 'out') AS outbound
          FROM stock_movements WHERE type IN ('in','out') AND created_at >= date_trunc('month', now()) - interval '6 months' GROUP BY 1)
        SELECT to_char(m, 'YYYY-MM') AS month, COALESCE(agg.inbound, 0)::int AS inbound, COALESCE(agg.outbound, 0)::int AS outbound
        FROM generate_series(date_trunc('month', now()) - interval '6 months', date_trunc('month', now()), interval '1 month') m
        LEFT JOIN agg USING (m) ORDER BY m`),
      q(`WITH rev AS (
          SELECT date_trunc('month', created_at) AS m, SUM(total) AS revenue FROM orders o
          WHERE ${SOLD} AND created_at >= date_trunc('month', now()) - interval '6 months' GROUP BY 1),
        col AS (
          SELECT date_trunc('month', created_at) AS m, SUM(amount) AS collected FROM payments
          WHERE created_at >= date_trunc('month', now()) - interval '6 months' GROUP BY 1)
        SELECT to_char(m, 'YYYY-MM') AS month, COALESCE(rev.revenue, 0) AS revenue, COALESCE(col.collected, 0) AS collected
        FROM generate_series(date_trunc('month', now()) - interval '6 months', date_trunc('month', now()), interval '1 month') m
        LEFT JOIN rev USING (m) LEFT JOIN col USING (m) ORDER BY m`),
      q(`WITH agg AS (
          SELECT created_at::date AS d, COALESCE(SUM(total) FILTER (WHERE ${SOLD}), 0) AS revenue, COUNT(*)::int AS orders
          FROM orders o WHERE created_at >= current_date - 29 GROUP BY 1)
        SELECT to_char(g, 'YYYY-MM-DD') AS day, COALESCE(agg.revenue, 0) AS revenue, COALESCE(agg.orders, 0) AS orders
        FROM generate_series(current_date - 29, current_date, interval '1 day') g
        LEFT JOIN agg ON agg.d = g::date ORDER BY g`),
      q(`SELECT p.id, p.name, p.category, SUM(i.quantity)::int AS units, SUM(i.quantity * i.price) AS revenue
        FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id
        WHERE ${SOLD} AND o.created_at >= now() - interval '90 days'
        GROUP BY p.id ORDER BY revenue DESC LIMIT 6`),
      q(`SELECT c.region, SUM(o.total) AS revenue, COUNT(*)::int AS orders
        FROM orders o JOIN clients c ON c.id = o.client_id
        WHERE ${SOLD} AND o.created_at >= now() - interval '90 days' GROUP BY c.region ORDER BY revenue DESC`),
      q(`SELECT status, COUNT(*)::int AS count FROM orders WHERE created_at >= now() - interval '30 days' GROUP BY status`),
      q(`SELECT p.category, SUM(i.quantity * i.price) AS revenue
        FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id
        WHERE ${SOLD} AND o.created_at >= now() - interval '90 days' GROUP BY p.category ORDER BY revenue DESC`),
      q(`SELECT a.id, a.number, a.status, a.created_at, w.name AS warehouse_name, w.city, u.full_name AS auditor_name,
          (SELECT COUNT(*) FROM audit_items i WHERE i.audit_id = a.id AND i.counted IS NOT NULL AND i.counted <> i.expected)::int AS mismatch_count
        FROM audits a JOIN warehouses w ON w.id = a.warehouse_id LEFT JOIN users u ON u.id = a.auditor_id
        ORDER BY a.created_at DESC LIMIT 6`),
      q(`SELECT p.name, p.sku, w.name AS warehouse_name, (s.quantity - s.reserved) AS available, p.min_stock
        FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id
        WHERE s.quantity - s.reserved <= p.min_stock ORDER BY (s.quantity - s.reserved)::float / GREATEST(p.min_stock, 1) LIMIT 6`),
      q(`SELECT o.id, o.number, o.status, o.total, o.created_at, c.name AS client_name
        FROM orders o JOIN clients c ON c.id = o.client_id ORDER BY o.created_at DESC LIMIT 6`),
    ]);

  res.json({
    kpi: kpi[0],
    flow,
    sales,
    daily,
    topProducts,
    regions,
    statuses,
    categories,
    audits,
    lowStock,
    recentOrders,
  });
});
