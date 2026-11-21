import { pool, type Db } from "../../core/db.js";
import { conflict, type PageQuery } from "../../core/http.js";

export type MovementType = "in" | "out" | "transfer" | "adjust";

export interface Movement {
  type: MovementType;
  warehouse_id: number;
  to_warehouse_id?: number | null;
  product_id: number;
  quantity: number;
  reference?: string | null;
  note?: string | null;
  user_id?: number | null;
  idempotency_key?: string | null;
  created_at?: Date;
}

async function lockRow(db: Db, warehouseId: number, productId: number) {
  await db.query(
    `INSERT INTO stock (warehouse_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
    [warehouseId, productId],
  );
  const { rows } = await db.query<{ quantity: number; reserved: number }>(
    `SELECT quantity, reserved FROM stock WHERE warehouse_id=$1 AND product_id=$2 FOR UPDATE`,
    [warehouseId, productId],
  );
  return rows[0];
}

export async function add(db: Db, warehouseId: number, productId: number, qty: number) {
  await lockRow(db, warehouseId, productId);
  await db.query(`UPDATE stock SET quantity = quantity + $3 WHERE warehouse_id=$1 AND product_id=$2`, [
    warehouseId,
    productId,
    qty,
  ]);
}

/** Removes free (non-reserved) stock. */
export async function remove(db: Db, warehouseId: number, productId: number, qty: number) {
  const row = await lockRow(db, warehouseId, productId);
  if (row.quantity - row.reserved < qty) throw conflict("Omborda yetarli bo'sh qoldiq yo'q");
  await db.query(`UPDATE stock SET quantity = quantity - $3 WHERE warehouse_id=$1 AND product_id=$2`, [
    warehouseId,
    productId,
    qty,
  ]);
}

export async function reserve(db: Db, warehouseId: number, productId: number, qty: number) {
  const row = await lockRow(db, warehouseId, productId);
  if (row.quantity - row.reserved < qty) throw conflict("Buyurtma uchun qoldiq yetarli emas");
  await db.query(`UPDATE stock SET reserved = reserved + $3 WHERE warehouse_id=$1 AND product_id=$2`, [
    warehouseId,
    productId,
    qty,
  ]);
}

export async function release(db: Db, warehouseId: number, productId: number, qty: number) {
  await db.query(
    `UPDATE stock SET reserved = GREATEST(reserved - $3, 0) WHERE warehouse_id=$1 AND product_id=$2`,
    [warehouseId, productId, qty],
  );
}

/** Ships previously reserved stock. */
export async function consumeReserved(db: Db, warehouseId: number, productId: number, qty: number) {
  await lockRow(db, warehouseId, productId);
  await db.query(
    `UPDATE stock SET quantity = quantity - $3, reserved = reserved - $3 WHERE warehouse_id=$1 AND product_id=$2`,
    [warehouseId, productId, qty],
  );
}

export async function setQuantity(db: Db, warehouseId: number, productId: number, qty: number) {
  const row = await lockRow(db, warehouseId, productId);
  await db.query(`UPDATE stock SET quantity = GREATEST($3, reserved) WHERE warehouse_id=$1 AND product_id=$2`, [
    warehouseId,
    productId,
    qty,
  ]);
  return Math.max(qty, row.reserved) - row.quantity;
}

export async function recordMovement(db: Db, m: Movement) {
  const { rows } = await db.query(
    `INSERT INTO stock_movements (type, warehouse_id, to_warehouse_id, product_id, quantity, reference, note, user_id, idempotency_key, created_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10, now())) RETURNING *`,
    [
      m.type,
      m.warehouse_id,
      m.to_warehouse_id ?? null,
      m.product_id,
      m.quantity,
      m.reference ?? null,
      m.note ?? null,
      m.user_id ?? null,
      m.idempotency_key ?? null,
      m.created_at ?? null,
    ],
  );
  return rows[0];
}

export async function findByKey(key: string) {
  const { rows } = await pool.query(`SELECT * FROM stock_movements WHERE idempotency_key=$1`, [key]);
  return rows[0];
}

export async function listStock(q: PageQuery & { warehouse_id?: number; low?: boolean }) {
  const where = `WHERE ($1::int IS NULL OR s.warehouse_id = $1)
    AND ($2::text IS NULL OR p.name ILIKE '%' || $2 || '%' OR p.sku ILIKE '%' || $2 || '%')
    AND ($3::bool IS NOT TRUE OR s.quantity - s.reserved <= p.min_stock)`;
  const params = [q.warehouse_id ?? null, q.q || null, q.low ?? null];
  const [items, count] = await Promise.all([
    pool.query(
      `SELECT s.*, (s.quantity - s.reserved) AS available, p.sku, p.name AS product_name, p.category, p.unit,
              p.min_stock, p.cost, p.price, p.expires_at, w.name AS warehouse_name
       FROM stock s JOIN products p ON p.id = s.product_id JOIN warehouses w ON w.id = s.warehouse_id
       ${where} ORDER BY w.name, p.name LIMIT $4 OFFSET $5`,
      [...params, q.limit, (q.page - 1) * q.limit],
    ),
    pool.query(`SELECT COUNT(*) FROM stock s JOIN products p ON p.id = s.product_id ${where}`, params),
  ]);
  return { items: items.rows, total: count.rows[0].count, page: q.page, limit: q.limit };
}

export async function listMovements(q: PageQuery & { warehouse_id?: number }) {
  const where = `WHERE ($1::int IS NULL OR m.warehouse_id = $1 OR m.to_warehouse_id = $1)
    AND ($2::text IS NULL OR m.type = $2)`;
  const params = [q.warehouse_id ?? null, q.status || null];
  const [items, count] = await Promise.all([
    pool.query(
      `SELECT m.*, p.name AS product_name, p.sku, w.name AS warehouse_name, tw.name AS to_warehouse_name, u.full_name AS user_name
       FROM stock_movements m
       JOIN products p ON p.id = m.product_id
       JOIN warehouses w ON w.id = m.warehouse_id
       LEFT JOIN warehouses tw ON tw.id = m.to_warehouse_id
       LEFT JOIN users u ON u.id = m.user_id
       ${where} ORDER BY m.created_at DESC LIMIT $3 OFFSET $4`,
      [...params, q.limit, (q.page - 1) * q.limit],
    ),
    pool.query(`SELECT COUNT(*) FROM stock_movements m ${where}`, params),
  ]);
  return { items: items.rows, total: count.rows[0].count, page: q.page, limit: q.limit };
}
