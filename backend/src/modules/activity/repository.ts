import type { Request } from "express";
import { pool, type Db } from "../../core/db.js";

export type Action =
  | "auth.login"
  | "auth.login_failed"
  | "auth.locked"
  | "profile.updated"
  | "profile.password_changed"
  | "user.created"
  | "user.updated"
  | "user.role_changed"
  | "user.password_reset"
  | "user.activated"
  | "user.deactivated"
  | "user.sessions_revoked";

export interface Entry {
  actor_id: number | null;
  action: Action;
  target_user_id?: number | null;
  details?: Record<string, unknown>;
  ip?: string | null;
}

export const ipOf = (req: Request) => req.ip ?? null;

export async function log(db: Db, e: Entry) {
  await db.query(`INSERT INTO activity_log (actor_id, action, target_user_id, details, ip) VALUES ($1,$2,$3,$4,$5)`, [
    e.actor_id,
    e.action,
    e.target_user_id ?? null,
    e.details ?? {},
    e.ip ?? null,
  ]);
}

const SELECT = `SELECT a.id, a.action, a.details, a.ip, a.created_at,
    a.actor_id, ua.full_name AS actor_name, a.target_user_id, ut.full_name AS target_name
  FROM activity_log a LEFT JOIN users ua ON ua.id = a.actor_id LEFT JOIN users ut ON ut.id = a.target_user_id`;

/** `group` = action prefix (auth | profile | user); `userId` matches actor or target. */
export async function list(q: { page: number; limit: number; group?: string; userId?: number; search?: string }) {
  const where = `WHERE ($1::text IS NULL OR a.action LIKE $1 || '.%')
    AND ($2::int IS NULL OR a.actor_id = $2 OR a.target_user_id = $2)
    AND ($3::text IS NULL OR ua.full_name ILIKE '%' || $3 || '%' OR ut.full_name ILIKE '%' || $3 || '%' OR a.ip ILIKE '%' || $3 || '%')`;
  const params = [q.group || null, q.userId ?? null, q.search || null];
  const [items, count] = await Promise.all([
    pool.query(`${SELECT} ${where} ORDER BY a.id DESC LIMIT $4 OFFSET $5`, [...params, q.limit, (q.page - 1) * q.limit]),
    pool.query(`SELECT COUNT(*) FROM activity_log a LEFT JOIN users ua ON ua.id = a.actor_id LEFT JOIN users ut ON ut.id = a.target_user_id ${where}`, params),
  ]);
  return { items: items.rows, total: Number(count.rows[0].count), page: q.page, limit: q.limit };
}

export async function recent(userId: number, limit = 20) {
  const { rows } = await pool.query(`${SELECT} WHERE a.actor_id = $1 OR a.target_user_id = $1 ORDER BY a.id DESC LIMIT $2`, [userId, limit]);
  return rows;
}
