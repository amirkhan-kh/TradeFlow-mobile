/**
 * Cross-table consistency check of the live database. Every query returns the rows that break a rule,
 * so 0 rows = rule holds. Usage: `npm run verify:data` (exit code 1 on any violation).
 */
import { pool } from "./db.js";

const RULES: [rule: string, sql: string][] = [
  [
    "stock.quantity = sum of its movements (in − out ± transfer + adjust)",
    `WITH ledger AS (
       SELECT warehouse_id, product_id,
              SUM(CASE type WHEN 'in' THEN quantity WHEN 'adjust' THEN quantity ELSE -quantity END) AS qty
       FROM stock_movements GROUP BY 1, 2
       UNION ALL
       SELECT to_warehouse_id, product_id, SUM(quantity) FROM stock_movements WHERE type = 'transfer' GROUP BY 1, 2
     ), total AS (SELECT warehouse_id, product_id, SUM(qty) AS qty FROM ledger GROUP BY 1, 2)
     SELECT s.warehouse_id, s.product_id, s.quantity, COALESCE(t.qty, 0) AS ledger
     FROM stock s FULL JOIN total t USING (warehouse_id, product_id)
     WHERE COALESCE(s.quantity, 0) <> COALESCE(t.qty, 0)`,
  ],
  [
    "stock.reserved = quantities of confirmed (not yet shipped) orders",
    `WITH res AS (
       SELECT o.warehouse_id, i.product_id, SUM(i.quantity) AS qty
       FROM orders o JOIN order_items i ON i.order_id = o.id WHERE o.status = 'confirmed' GROUP BY 1, 2
     )
     SELECT s.warehouse_id, s.product_id, s.reserved, COALESCE(r.qty, 0) AS confirmed
     FROM stock s FULL JOIN res r USING (warehouse_id, product_id)
     WHERE COALESCE(s.reserved, 0) <> COALESCE(r.qty, 0)`,
  ],
  [
    "client.balance = shipped/delivered order totals − payments",
    `SELECT c.id, c.balance,
            COALESCE((SELECT SUM(total) FROM orders WHERE client_id = c.id AND status IN ('shipped','delivered')), 0)
          - COALESCE((SELECT SUM(amount) FROM payments WHERE client_id = c.id), 0) AS expected
     FROM clients c
     WHERE c.balance <> COALESCE((SELECT SUM(total) FROM orders WHERE client_id = c.id AND status IN ('shipped','delivered')), 0)
                      - COALESCE((SELECT SUM(amount) FROM payments WHERE client_id = c.id), 0)`,
  ],
  [
    "order.subtotal = Σ items, total = subtotal − discount",
    `SELECT o.id, o.subtotal, o.total, SUM(i.quantity * i.price) AS items
     FROM orders o JOIN order_items i ON i.order_id = o.id
     GROUP BY o.id
     HAVING o.subtotal <> SUM(i.quantity * i.price) OR abs(o.total - round(o.subtotal * (1 - o.discount_pct / 100.0))) > 1`,
  ],
  ["every order has at least one line", `SELECT o.id FROM orders o WHERE NOT EXISTS (SELECT 1 FROM order_items WHERE order_id = o.id)`],
  [
    "shipped/delivered orders have a delivery, other orders have none",
    `SELECT o.id, o.status, d.id AS delivery_id FROM orders o LEFT JOIN deliveries d ON d.order_id = o.id
     WHERE (o.status IN ('shipped','delivered')) <> (d.id IS NOT NULL)`,
  ],
  [
    "delivered order ⇔ delivered delivery",
    `SELECT o.id, o.status, d.status AS delivery FROM orders o JOIN deliveries d ON d.order_id = o.id
     WHERE (o.status = 'delivered') <> (d.status = 'delivered')`,
  ],
  [
    "shipped stock left the warehouse: one `out` movement per shipped line",
    `SELECT o.id, i.product_id FROM orders o JOIN order_items i ON i.order_id = o.id
     WHERE o.status IN ('shipped','delivered')
       AND NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m.type = 'out' AND m.reference = o.number
                       AND m.product_id = i.product_id AND m.warehouse_id = o.warehouse_id AND m.quantity = i.quantity)`,
  ],
  [
    "payment for an order belongs to the order's client",
    `SELECT p.id FROM payments p JOIN orders o ON o.id = p.order_id WHERE p.client_id <> o.client_id`,
  ],
  [
    "order agent / client agent / courier / auditor have the right role",
    `SELECT 'order' AS kind, o.id FROM orders o JOIN users u ON u.id = o.agent_id WHERE u.role NOT IN ('agent','manager','admin')
     UNION ALL SELECT 'client', c.id FROM clients c JOIN users u ON u.id = c.agent_id WHERE u.role <> 'agent'
     UNION ALL SELECT 'delivery', d.id FROM deliveries d JOIN users u ON u.id = d.courier_id WHERE u.role <> 'courier'
     UNION ALL SELECT 'audit', a.id FROM audits a JOIN users u ON u.id = a.auditor_id WHERE u.role NOT IN ('auditor','manager','admin')`,
  ],
  [
    "approved audit mismatches were written to stock as `adjust` movements",
    `SELECT a.id, ai.product_id FROM audits a JOIN audit_items ai ON ai.audit_id = a.id
     WHERE a.status = 'approved' AND ai.counted IS NOT NULL AND ai.counted <> ai.expected
       AND NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m.type = 'adjust' AND m.reference = a.number AND m.product_id = ai.product_id)`,
  ],
  [
    "no event happens in the future",
    `WITH t(v) AS (SELECT now() + interval '1 minute')
     SELECT 'order', id FROM orders, t WHERE created_at > v OR updated_at > v
     UNION ALL SELECT 'delivery', id FROM deliveries, t WHERE created_at > v OR delivered_at > v
     UNION ALL SELECT 'payment', id FROM payments, t WHERE created_at > v
     UNION ALL SELECT 'movement', id FROM stock_movements, t WHERE created_at > v
     UNION ALL SELECT 'audit', id FROM audits, t WHERE created_at > v OR completed_at > v OR approved_at > v`,
  ],
];

const COUNTS = ["users", "warehouses", "products", "clients", "orders", "order_items", "deliveries", "payments", "stock", "stock_movements", "audits", "leads"];

let failed = 0;
for (const [rule, sql] of RULES) {
  const { rows, rowCount } = await pool.query(sql);
  if (rowCount) failed++;
  console.log(`${rowCount ? "FAIL" : " ok "}  ${rule}${rowCount ? `  → ${rowCount} rows, e.g. ${JSON.stringify(rows.slice(0, 3))}` : ""}`);
}
const { rows } = await pool.query(`SELECT ${COUNTS.map((t) => `(SELECT COUNT(*) FROM ${t}) AS ${t}`).join(", ")}`);
console.log("\ncounts:", rows[0]);
await pool.end();
process.exit(failed ? 1 : 0);
