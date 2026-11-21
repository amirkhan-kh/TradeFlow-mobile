import { pool, type Db } from "../../core/db.js";
import type { PageQuery } from "../../core/http.js";

export interface ClientInput {
  name: string;
  owner_name?: string;
  phone?: string;
  region: string;
  address?: string;
  inn?: string;
  segment: "A" | "B" | "C";
  agent_id?: number | null;
  credit_limit: number;
}

const COLS = ["name", "owner_name", "phone", "region", "address", "inn", "segment", "agent_id", "credit_limit"] as const;
const values = (c: ClientInput) => COLS.map((k) => c[k] ?? null);

export async function list({ page, limit, q, status }: PageQuery) {
  const where = `WHERE ($1::text IS NULL OR c.name ILIKE '%' || $1 || '%' OR c.phone ILIKE '%' || $1 || '%' OR c.region ILIKE '%' || $1 || '%')
    AND ($2::text IS NULL OR ($2 = 'debt' AND c.balance > 0) OR ($2 = 'overlimit' AND c.balance > c.credit_limit) OR c.segment = $2)`;
  const params = [q || null, status || null];
  const [items, count] = await Promise.all([
    pool.query(
      `SELECT c.*, u.full_name AS agent_name,
        (SELECT MAX(created_at) FROM orders o WHERE o.client_id = c.id) AS last_order_at
       FROM clients c LEFT JOIN users u ON u.id = c.agent_id
       ${where} ORDER BY c.balance DESC, c.name LIMIT $3 OFFSET $4`,
      [...params, limit, (page - 1) * limit],
    ),
    pool.query(`SELECT COUNT(*) FROM clients c ${where}`, params),
  ]);
  return { items: items.rows, total: count.rows[0].count, page, limit };
}

export async function get(id: number) {
  const { rows } = await pool.query(
    `SELECT c.*, u.full_name AS agent_name FROM clients c LEFT JOIN users u ON u.id = c.agent_id WHERE c.id=$1`,
    [id],
  );
  return rows[0];
}

/** Reconciliation (akt sverki): shipped orders as debit, payments as credit. */
export async function ledger(id: number) {
  const { rows } = await pool.query(
    `SELECT * FROM (
       SELECT 'order' AS kind, o.number AS ref, o.total AS debit, 0::numeric AS credit, o.updated_at AS at
       FROM orders o WHERE o.client_id=$1 AND o.status IN ('shipped','delivered')
       UNION ALL
       SELECT 'payment', p.method, 0, p.amount, p.created_at FROM payments p WHERE p.client_id=$1
     ) t ORDER BY at DESC LIMIT 100`,
    [id],
  );
  return rows;
}

export async function insert(c: ClientInput) {
  const { rows } = await pool.query(
    `INSERT INTO clients (${COLS.join(",")}) VALUES (${COLS.map((_, i) => `$${i + 1}`).join(",")}) RETURNING *`,
    values(c),
  );
  return rows[0];
}

export async function update(id: number, c: ClientInput) {
  const { rows } = await pool.query(
    `UPDATE clients SET ${COLS.map((k, i) => `${k}=$${i + 2}`).join(",")} WHERE id=$1 RETURNING *`,
    [id, ...values(c)],
  );
  return rows[0];
}

export async function changeBalance(db: Db, id: number, delta: number) {
  await db.query(`UPDATE clients SET balance = balance + $2 WHERE id=$1`, [id, delta]);
}
