import { Router } from "express";
import { pool } from "../../core/db.js";

/** Field team KPIs: sales agents vs monthly plan, couriers by deliveries. */
export const agentsRouter = Router();

agentsRouter.get("/", async (_req, res) => {
  const [agents, couriers] = await Promise.all([
    pool.query(`
      SELECT u.id, u.full_name, u.phone, u.region, u.monthly_plan,
        COALESCE(m.revenue, 0) AS revenue_month,
        COALESCE(m.orders, 0)::int AS orders_month,
        COALESCE(pm.revenue, 0) AS revenue_prev_month,
        (SELECT COUNT(*) FROM clients c WHERE c.agent_id = u.id)::int AS clients,
        (SELECT COUNT(DISTINCT o.client_id) FROM orders o WHERE o.agent_id = u.id AND o.created_at >= date_trunc('month', now()))::int AS active_clients,
        (SELECT COALESCE(SUM(c.balance),0) FROM clients c WHERE c.agent_id = u.id AND c.balance > 0) AS clients_debt,
        ROUND(100.0 * COALESCE(m.revenue,0) / NULLIF(u.monthly_plan,0), 1) AS plan_pct
      FROM users u
      LEFT JOIN LATERAL (
        SELECT SUM(total) AS revenue, COUNT(*) AS orders FROM orders o
        WHERE o.agent_id = u.id AND o.status IN ('shipped','delivered') AND o.created_at >= date_trunc('month', now())
      ) m ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(total) AS revenue FROM orders o
        WHERE o.agent_id = u.id AND o.status IN ('shipped','delivered')
          AND o.created_at >= date_trunc('month', now()) - interval '1 month' AND o.created_at < date_trunc('month', now())
      ) pm ON TRUE
      WHERE u.role = 'agent' AND u.active
      ORDER BY revenue_month DESC`),
    pool.query(`
      SELECT u.id, u.full_name, u.phone,
        COUNT(d.*) FILTER (WHERE d.status = 'delivered' AND d.delivered_at >= date_trunc('month', now()))::int AS delivered_month,
        COUNT(d.*) FILTER (WHERE d.status IN ('pending','on_route'))::int AS active,
        COUNT(d.*) FILTER (WHERE d.status = 'failed')::int AS failed
      FROM users u LEFT JOIN deliveries d ON d.courier_id = u.id
      WHERE u.role = 'courier' AND u.active
      GROUP BY u.id ORDER BY delivered_month DESC`),
  ]);
  res.json({ agents: agents.rows, couriers: couriers.rows });
});
