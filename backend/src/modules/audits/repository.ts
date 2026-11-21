import { pool, type Db } from "../../core/db.js";
import type { PageQuery } from "../../core/http.js";

export interface AuditRow {
  id: number;
  number: string;
  warehouse_id: number;
  status: "in_progress" | "completed" | "approved";
}

const SUMMARY = `
  (SELECT COUNT(*) FROM audit_items i WHERE i.audit_id = a.id)::int AS items_count,
  (SELECT COUNT(*) FROM audit_items i WHERE i.audit_id = a.id AND i.counted IS NOT NULL)::int AS counted_count,
  (SELECT COUNT(*) FROM audit_items i WHERE i.audit_id = a.id AND i.counted IS NOT NULL AND i.counted <> i.expected)::int AS mismatch_count,
  (SELECT COALESCE(SUM((i.counted - i.expected) * p.cost),0) FROM audit_items i JOIN products p ON p.id = i.product_id
     WHERE i.audit_id = a.id AND i.counted IS NOT NULL) AS variance_value`;

export async function list({ page, limit, q, status }: PageQuery) {
  const where = `WHERE ($1::text IS NULL OR a.number ILIKE '%' || $1 || '%' OR w.name ILIKE '%' || $1 || '%')
    AND ($2::text IS NULL OR a.status = $2)`;
  const params = [q || null, status || null];
  const [items, count] = await Promise.all([
    pool.query(
      `SELECT a.*, w.name AS warehouse_name, w.city, u.full_name AS auditor_name, ${SUMMARY}
       FROM audits a JOIN warehouses w ON w.id = a.warehouse_id LEFT JOIN users u ON u.id = a.auditor_id
       ${where} ORDER BY a.created_at DESC LIMIT $3 OFFSET $4`,
      [...params, limit, (page - 1) * limit],
    ),
    pool.query(`SELECT COUNT(*) FROM audits a JOIN warehouses w ON w.id = a.warehouse_id ${where}`, params),
  ]);
  return { items: items.rows, total: count.rows[0].count, page, limit };
}

export async function get(id: number) {
  const { rows } = await pool.query(
    `SELECT a.*, w.name AS warehouse_name, w.city, u.full_name AS auditor_name, ${SUMMARY}
     FROM audits a JOIN warehouses w ON w.id = a.warehouse_id LEFT JOIN users u ON u.id = a.auditor_id WHERE a.id=$1`,
    [id],
  );
  if (!rows[0]) return undefined;
  const items = await pool.query(
    `SELECT i.*, p.name AS product_name, p.sku, p.unit, p.cost FROM audit_items i JOIN products p ON p.id = i.product_id
     WHERE i.audit_id=$1 ORDER BY p.name`,
    [id],
  );
  return { ...rows[0], items: items.rows };
}

export async function lock(db: Db, id: number) {
  const { rows } = await db.query<AuditRow>(`SELECT * FROM audits WHERE id=$1 FOR UPDATE`, [id]);
  return rows[0];
}

export async function insert(db: Db, a: { warehouse_id: number; auditor_id: number | null; note?: string; created_at?: Date }) {
  const { rows } = await db.query<AuditRow>(
    `WITH n AS (SELECT nextval('audits_id_seq') AS id)
     INSERT INTO audits (id, number, warehouse_id, auditor_id, note, created_at)
     SELECT n.id, 'AU-' || lpad(n.id::text, 5, '0'), $1, $2, $3, COALESCE($4, now()) FROM n RETURNING *`,
    [a.warehouse_id, a.auditor_id, a.note ?? null, a.created_at ?? null],
  );
  await db.query(
    `INSERT INTO audit_items (audit_id, product_id, expected)
     SELECT $1, product_id, quantity FROM stock WHERE warehouse_id=$2`,
    [rows[0].id, a.warehouse_id],
  );
  return rows[0];
}

export async function setCounts(db: Db, id: number, counts: { product_id: number; counted: number | null }[]) {
  for (const c of counts) {
    await db.query(`UPDATE audit_items SET counted=$3 WHERE audit_id=$1 AND product_id=$2`, [id, c.product_id, c.counted]);
  }
}

export async function uncounted(db: Db, id: number) {
  const { rows } = await db.query<{ count: number }>(
    `SELECT COUNT(*) FROM audit_items WHERE audit_id=$1 AND counted IS NULL`,
    [id],
  );
  return rows[0].count;
}

export async function mismatches(db: Db, id: number) {
  const { rows } = await db.query<{ product_id: number; counted: number }>(
    `SELECT product_id, counted FROM audit_items WHERE audit_id=$1 AND counted IS NOT NULL AND counted <> expected`,
    [id],
  );
  return rows;
}

export async function setStatus(db: Db, id: number, status: AuditRow["status"], at?: Date) {
  const col = status === "completed" ? "completed_at" : status === "approved" ? "approved_at" : null;
  await db.query(`UPDATE audits SET status=$2 ${col ? `, ${col}=COALESCE($3, now())` : ""} WHERE id=$1`, [
    id,
    status,
    ...(col ? [at ?? null] : []),
  ]);
}
