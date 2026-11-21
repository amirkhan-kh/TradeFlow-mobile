import { pool, type Db } from "../../core/db.js";
import type { PageQuery } from "../../core/http.js";

export interface ProductInput {
  sku: string;
  name: string;
  category: string;
  unit: string;
  weight_kg: number;
  price: number;
  cost: number;
  min_stock: number;
  expires_at?: string | null;
  active: boolean;
  ikpu?: string;
  package_code?: string;
  vat_rate: number;
}

const COLS = ["sku", "name", "category", "unit", "weight_kg", "price", "cost", "min_stock", "expires_at", "active", "ikpu", "package_code", "vat_rate"] as const;
const values = (p: ProductInput) => COLS.map((c) => p[c] ?? null);

export async function list({ page, limit, q, status, active }: PageQuery & { active?: boolean }) {
  const where = `WHERE ($1::text IS NULL OR p.name ILIKE '%' || $1 || '%' OR p.sku ILIKE '%' || $1 || '%')
    AND ($2::text IS NULL OR p.category = $2) AND ($3::boolean IS NULL OR p.active = $3)`;
  const params = [q || null, status || null, active ?? null];
  const [items, count] = await Promise.all([
    pool.query(
      `SELECT p.*, COALESCE(SUM(s.quantity),0)::int AS stock, COALESCE(SUM(s.reserved),0)::int AS reserved
       FROM products p LEFT JOIN stock s ON s.product_id = p.id
       ${where} GROUP BY p.id ORDER BY p.name LIMIT $4 OFFSET $5`,
      [...params, limit, (page - 1) * limit],
    ),
    pool.query(`SELECT COUNT(*) FROM products p ${where}`, params),
  ]);
  return { items: items.rows, total: count.rows[0].count, page, limit };
}

export async function categories() {
  const { rows } = await pool.query<{ category: string }>("SELECT DISTINCT category FROM products ORDER BY 1");
  return rows.map((r) => r.category);
}

export async function insert(p: ProductInput) {
  const { rows } = await pool.query(
    `INSERT INTO products (${COLS.join(",")}) VALUES (${COLS.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
    values(p),
  );
  return rows[0];
}

export interface ExternalProduct {
  sku: string;
  name: string;
  category?: string;
  unit?: string;
  price: number;
  cost?: number;
  weight_kg?: number;
  active?: boolean;
}

/** Import from an external master (1C, iiko): SKU is the key; fields not sent keep their value. */
export async function upsertBySku(db: Db, items: ExternalProduct[]) {
  let created = 0;
  for (const p of items) {
    const { rows } = await db.query<{ inserted: boolean }>(
      `INSERT INTO products (sku, name, category, unit, price, cost, weight_kg, active)
       VALUES ($1, $2, COALESCE($3, 'Boshqa'), COALESCE($4, 'dona'), $5, COALESCE($6, 0), COALESCE($7, 0), COALESCE($8, TRUE))
       ON CONFLICT (sku) DO UPDATE SET
         name = EXCLUDED.name, price = EXCLUDED.price,
         category = COALESCE($3, products.category), unit = COALESCE($4, products.unit),
         cost = COALESCE($6, products.cost), weight_kg = COALESCE($7, products.weight_kg), active = COALESCE($8, products.active)
       RETURNING (xmax = 0) AS inserted`,
      [p.sku, p.name, p.category ?? null, p.unit ?? null, p.price, p.cost ?? null, p.weight_kg ?? null, p.active ?? null],
    );
    if (rows[0].inserted) created++;
  }
  return { created, updated: items.length - created };
}

export async function update(id: number, p: ProductInput) {
  const { rows } = await pool.query(
    `UPDATE products SET ${COLS.map((c, i) => `${c}=$${i + 2}`).join(",")} WHERE id=$1 RETURNING *`,
    [id, ...values(p)],
  );
  return rows[0];
}
