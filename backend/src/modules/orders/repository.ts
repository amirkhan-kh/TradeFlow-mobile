import { pool, type Db } from "../../core/db.js";
import type { PageQuery } from "../../core/http.js";

export type OrderStatus = "new" | "confirmed" | "shipped" | "delivered" | "cancelled";

export interface OrderRow {
  id: number;
  number: string;
  client_id: number;
  agent_id: number | null;
  warehouse_id: number;
  status: OrderStatus;
  subtotal: number;
  discount_pct: number;
  total: number;
}

export interface ItemRow {
  product_id: number;
  quantity: number;
  price: number;
}

export async function list({ page, limit, q, status }: PageQuery) {
  const where = `WHERE ($1::text IS NULL OR o.number ILIKE '%' || $1 || '%' OR c.name ILIKE '%' || $1 || '%')
    AND ($2::text IS NULL OR o.status = $2)`;
  const params = [q || null, status || null];
  const [items, count, counts] = await Promise.all([
    pool.query(
      `SELECT o.*, c.name AS client_name, c.region, u.full_name AS agent_name, w.name AS warehouse_name,
        (SELECT COUNT(*) FROM order_items i WHERE i.order_id = o.id)::int AS items_count
       FROM orders o JOIN clients c ON c.id = o.client_id
       JOIN warehouses w ON w.id = o.warehouse_id
       LEFT JOIN users u ON u.id = o.agent_id
       ${where} ORDER BY o.created_at DESC LIMIT $3 OFFSET $4`,
      [...params, limit, (page - 1) * limit],
    ),
    pool.query(`SELECT COUNT(*) FROM orders o JOIN clients c ON c.id = o.client_id ${where}`, params),
    pool.query<{ status: string; count: number }>(`SELECT status, COUNT(*) FROM orders GROUP BY status`),
  ]);
  return {
    items: items.rows,
    total: count.rows[0].count,
    page,
    limit,
    counts: Object.fromEntries(counts.rows.map((r) => [r.status, r.count])),
  };
}

export async function get(id: number) {
  const { rows } = await pool.query(
    `SELECT o.*, c.name AS client_name, c.phone AS client_phone, c.address AS client_address, c.balance AS client_balance,
       u.full_name AS agent_name, w.name AS warehouse_name,
       d.status AS delivery_status, d.vehicle, cu.full_name AS courier_name
     FROM orders o JOIN clients c ON c.id = o.client_id
     JOIN warehouses w ON w.id = o.warehouse_id
     LEFT JOIN users u ON u.id = o.agent_id
     LEFT JOIN deliveries d ON d.order_id = o.id
     LEFT JOIN users cu ON cu.id = d.courier_id
     WHERE o.id=$1`,
    [id],
  );
  if (!rows[0]) return undefined;
  const items = await pool.query(
    `SELECT i.*, p.name AS product_name, p.sku, p.unit FROM order_items i JOIN products p ON p.id = i.product_id
     WHERE i.order_id=$1 ORDER BY i.id`,
    [id],
  );
  return { ...rows[0], items: items.rows };
}

export async function lock(db: Db, id: number) {
  const { rows } = await db.query<OrderRow>(`SELECT * FROM orders WHERE id=$1 FOR UPDATE`, [id]);
  return rows[0];
}

export async function items(db: Db, orderId: number) {
  const { rows } = await db.query<ItemRow>(`SELECT product_id, quantity, price FROM order_items WHERE order_id=$1`, [
    orderId,
  ]);
  return rows;
}

export async function prices(db: Db, productIds: number[]) {
  const { rows } = await db.query<{ id: number; price: number }>(
    `SELECT id, price FROM products WHERE id = ANY($1::int[]) AND active`,
    [productIds],
  );
  return new Map(rows.map((r) => [r.id, r.price]));
}

export async function insert(
  db: Db,
  o: Omit<OrderRow, "id" | "number" | "status"> & { status?: OrderStatus; note?: string | null; created_at?: Date },
  lines: ItemRow[],
) {
  const { rows } = await db.query<OrderRow>(
    `WITH n AS (SELECT nextval('orders_id_seq') AS id)
     INSERT INTO orders (id, number, client_id, agent_id, warehouse_id, status, subtotal, discount_pct, total, note, created_at, updated_at)
     SELECT n.id, 'TF-' || lpad(n.id::text, 6, '0'), $1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, now()), COALESCE($9, now()) FROM n
     RETURNING *`,
    [
      o.client_id,
      o.agent_id,
      o.warehouse_id,
      o.status ?? "new",
      o.subtotal,
      o.discount_pct,
      o.total,
      o.note ?? null,
      o.created_at ?? null,
    ],
  );
  const order = rows[0];
  for (const l of lines) {
    await db.query(`INSERT INTO order_items (order_id, product_id, quantity, price) VALUES ($1,$2,$3,$4)`, [
      order.id,
      l.product_id,
      l.quantity,
      l.price,
    ]);
  }
  return order;
}

export async function setStatus(db: Db, id: number, status: OrderStatus, at?: Date) {
  await db.query(`UPDATE orders SET status=$2, updated_at=COALESCE($3, now()) WHERE id=$1`, [id, status, at ?? null]);
}
