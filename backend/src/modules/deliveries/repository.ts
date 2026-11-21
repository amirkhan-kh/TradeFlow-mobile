import { pool, type Db } from "../../core/db.js";
import type { PageQuery } from "../../core/http.js";

export async function ensure(db: Db, orderId: number, courierId: number | null, vehicle: string | null, at?: Date) {
  await db.query(
    `INSERT INTO deliveries (order_id, courier_id, vehicle, scheduled_at, created_at)
     VALUES ($1,$2,$3, COALESCE($4::timestamptz, now())::date, COALESCE($4, now()))
     ON CONFLICT (order_id) DO UPDATE SET courier_id = COALESCE(EXCLUDED.courier_id, deliveries.courier_id),
       vehicle = COALESCE(EXCLUDED.vehicle, deliveries.vehicle)`,
    [orderId, courierId, vehicle, at ?? null],
  );
}

export async function markDelivered(db: Db, orderId: number, at?: Date) {
  await db.query(`UPDATE deliveries SET status='delivered', delivered_at=COALESCE($2, now()) WHERE order_id=$1`, [
    orderId,
    at ?? null,
  ]);
}

export async function get(id: number) {
  const { rows } = await pool.query(`SELECT * FROM deliveries WHERE id=$1`, [id]);
  return rows[0];
}

export async function update(
  id: number,
  d: { courier_id?: number | null; vehicle?: string; status?: string; note?: string; scheduled_at?: string },
) {
  const { rows } = await pool.query(
    `UPDATE deliveries SET
       courier_id = COALESCE($2, courier_id), vehicle = COALESCE($3, vehicle),
       status = COALESCE($4, status), note = COALESCE($5, note), scheduled_at = COALESCE($6::date, scheduled_at)
     WHERE id=$1 RETURNING *`,
    [id, d.courier_id ?? null, d.vehicle ?? null, d.status ?? null, d.note ?? null, d.scheduled_at ?? null],
  );
  return rows[0];
}

export async function list({ page, limit, q, status }: PageQuery) {
  const where = `WHERE ($1::text IS NULL OR o.number ILIKE '%' || $1 || '%' OR c.name ILIKE '%' || $1 || '%' OR c.region ILIKE '%' || $1 || '%')
    AND ($2::text IS NULL OR d.status = $2)`;
  const params = [q || null, status || null];
  const [items, count, summary] = await Promise.all([
    pool.query(
      `SELECT d.*, o.number AS order_number, o.total, c.name AS client_name, c.region, c.address, c.phone,
         u.full_name AS courier_name, w.name AS warehouse_name,
         (SELECT COALESCE(SUM(i.quantity * p.weight_kg),0) FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = o.id) AS weight_kg
       FROM deliveries d JOIN orders o ON o.id = d.order_id JOIN clients c ON c.id = o.client_id
       JOIN warehouses w ON w.id = o.warehouse_id LEFT JOIN users u ON u.id = d.courier_id
       ${where}
       ORDER BY CASE d.status WHEN 'on_route' THEN 0 WHEN 'pending' THEN 1 WHEN 'failed' THEN 2 ELSE 3 END, d.scheduled_at DESC, d.id DESC
       LIMIT $3 OFFSET $4`,
      [...params, limit, (page - 1) * limit],
    ),
    pool.query(
      `SELECT COUNT(*) FROM deliveries d JOIN orders o ON o.id = d.order_id JOIN clients c ON c.id = o.client_id ${where}`,
      params,
    ),
    pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status='pending') AS pending,
        COUNT(*) FILTER (WHERE status='on_route') AS on_route,
        COUNT(*) FILTER (WHERE status='delivered' AND delivered_at >= date_trunc('day', now())) AS delivered_today,
        COUNT(*) FILTER (WHERE status='failed') AS failed,
        ROUND(100.0 * COUNT(*) FILTER (WHERE status='delivered' AND delivered_at::date <= scheduled_at + 1)
          / NULLIF(COUNT(*) FILTER (WHERE status='delivered'), 0), 1) AS on_time_pct
      FROM deliveries`),
  ]);
  return { items: items.rows, total: count.rows[0].count, page, limit, summary: summary.rows[0] };
}
