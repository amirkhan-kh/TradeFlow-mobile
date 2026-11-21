import { pool, type Db } from "../../core/db.js";
import type { PageQuery } from "../../core/http.js";

export interface WarehouseInput {
  code: string;
  name: string;
  city: string;
  address?: string;
  capacity: number;
  manager_name?: string;
  active: boolean;
}

const SELECT = `
  SELECT w.*,
    COALESCE(s.units, 0)::int AS units,
    COALESCE(s.value, 0)::numeric AS stock_value,
    COALESCE(s.skus, 0)::int AS skus,
    a.status AS last_audit_status,
    a.created_at AS last_audit_at
  FROM warehouses w
  LEFT JOIN LATERAL (
    SELECT SUM(st.quantity) AS units, SUM(st.quantity * p.cost) AS value, COUNT(*) FILTER (WHERE st.quantity > 0) AS skus
    FROM stock st JOIN products p ON p.id = st.product_id WHERE st.warehouse_id = w.id
  ) s ON TRUE
  LEFT JOIN LATERAL (
    SELECT status, created_at FROM audits WHERE warehouse_id = w.id ORDER BY created_at DESC LIMIT 1
  ) a ON TRUE`;

export async function list({ page, limit, q, active }: PageQuery & { active?: boolean }) {
  const where = `WHERE ($1::text IS NULL OR w.name ILIKE '%' || $1 || '%' OR w.city ILIKE '%' || $1 || '%' OR w.code ILIKE '%' || $1 || '%')
    AND ($2::boolean IS NULL OR w.active = $2)`;
  const params = [q || null, active ?? null];
  const [items, count] = await Promise.all([
    pool.query(`${SELECT} ${where} ORDER BY w.id LIMIT $3 OFFSET $4`, [...params, limit, (page - 1) * limit]),
    pool.query(`SELECT COUNT(*) FROM warehouses w ${where}`, params),
  ]);
  return { items: items.rows, total: count.rows[0].count, page, limit };
}

/** Closed warehouses keep their history but take no new orders or incoming stock. */
export async function isActive(db: Db, id: number) {
  const { rows } = await db.query<{ active: boolean }>(`SELECT active FROM warehouses WHERE id = $1`, [id]);
  return rows[0]?.active === true;
}

export async function get(id: number) {
  const { rows } = await pool.query(`${SELECT} WHERE w.id = $1`, [id]);
  return rows[0];
}

export async function insert(w: WarehouseInput) {
  const { rows } = await pool.query(
    `INSERT INTO warehouses (code, name, city, address, capacity, manager_name, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [w.code, w.name, w.city, w.address ?? null, w.capacity, w.manager_name ?? null, w.active],
  );
  return rows[0];
}

export async function update(id: number, w: WarehouseInput) {
  const { rows } = await pool.query(
    `UPDATE warehouses SET code=$2, name=$3, city=$4, address=$5, capacity=$6, manager_name=$7, active=$8
     WHERE id=$1 RETURNING *`,
    [id, w.code, w.name, w.city, w.address ?? null, w.capacity, w.manager_name ?? null, w.active],
  );
  return rows[0];
}
