import { pool, type Db } from "../../core/db.js";
import type { Role } from "../../core/auth.js";

export interface UserRow {
  id: number;
  username: string;
  password_hash: string;
  full_name: string;
  role: Role;
  phone: string | null;
  email: string | null;
  region: string | null;
  monthly_plan: number;
  active: boolean;
  last_login_at: string | null;
  password_changed_at: string | null;
  token_version: number;
  created_at: string;
}

export interface Profile {
  full_name: string;
  phone?: string;
  email?: string;
}
export interface UserInput extends Profile {
  role: Role;
  region?: string;
  monthly_plan?: number;
}

export const toPublic = ({ password_hash: _, token_version: __, ...u }: UserRow) => u;

export async function findByUsername(username: string) {
  const { rows } = await pool.query<UserRow>("SELECT * FROM users WHERE username = lower($1)", [username]);
  return rows[0];
}

export async function findById(id: number, db: Db = pool, lock = false) {
  const { rows } = await db.query<UserRow>(`SELECT * FROM users WHERE id = $1 ${lock ? "FOR UPDATE" : ""}`, [id]);
  return rows[0];
}

/** Admin sees everyone; other roles get active users only (assignment dropdowns). */
export async function list(f: { role?: string; q?: string; status?: string; activeOnly: boolean }) {
  const { rows } = await pool.query<UserRow>(
    `SELECT * FROM users
     WHERE ($1::text IS NULL OR role = $1)
       AND ($2::text IS NULL OR full_name ILIKE '%' || $2 || '%' OR username ILIKE '%' || $2 || '%' OR phone ILIKE '%' || $2 || '%')
       AND ($3::text IS NULL OR ($3 = 'active' AND active) OR ($3 = 'inactive' AND NOT active))
       AND (NOT $4 OR active)
     ORDER BY active DESC, full_name`,
    [f.role || null, f.q || null, f.status || null, f.activeOnly],
  );
  return rows.map(toPublic);
}

export async function insert(db: Db, u: UserInput & { username: string; password_hash: string }) {
  const { rows } = await db.query<UserRow>(
    `INSERT INTO users (username, password_hash, full_name, role, phone, email, region, monthly_plan, password_changed_at)
     VALUES (lower($1),$2,$3,$4,$5,$6,$7,$8, now()) RETURNING *`,
    [u.username, u.password_hash, u.full_name, u.role, u.phone || null, u.email || null, u.region || null, u.monthly_plan ?? 0],
  );
  return rows[0];
}

export async function update(db: Db, id: number, u: UserInput) {
  const { rows } = await db.query<UserRow>(
    `UPDATE users SET full_name=$2, role=$3, phone=$4, email=$5, region=$6, monthly_plan=$7 WHERE id=$1 RETURNING *`,
    [id, u.full_name, u.role, u.phone || null, u.email || null, u.region || null, u.monthly_plan ?? 0],
  );
  return rows[0];
}

export async function updateProfile(db: Db, id: number, p: Profile) {
  const { rows } = await db.query<UserRow>(`UPDATE users SET full_name=$2, phone=$3, email=$4 WHERE id=$1 RETURNING *`, [
    id,
    p.full_name,
    p.phone || null,
    p.email || null,
  ]);
  return rows[0];
}

/** Every credential/status change bumps token_version → all open sessions end. */
export async function setPassword(db: Db, id: number, hash: string) {
  const { rows } = await db.query<UserRow>(
    `UPDATE users SET password_hash=$2, password_changed_at=now(), token_version=token_version+1 WHERE id=$1 RETURNING *`,
    [id, hash],
  );
  return rows[0];
}

export async function setActive(db: Db, id: number, active: boolean) {
  const { rows } = await db.query<UserRow>(`UPDATE users SET active=$2, token_version=token_version+1 WHERE id=$1 RETURNING *`, [id, active]);
  return rows[0];
}

export async function revokeSessions(db: Db, id: number) {
  const { rows } = await db.query<UserRow>(`UPDATE users SET token_version=token_version+1 WHERE id=$1 RETURNING *`, [id]);
  return rows[0];
}

export async function touchLogin(id: number) {
  await pool.query(`UPDATE users SET last_login_at=now() WHERE id=$1`, [id]);
}

/** Locks active admins (always before the target row, by id) so concurrent demotions serialize instead of deadlocking. */
export async function lockActiveAdmins(db: Db) {
  const { rows } = await db.query<{ id: number }>(`SELECT id FROM users WHERE role='admin' AND active ORDER BY id FOR UPDATE`);
  return rows.map((r) => r.id);
}

export async function stats() {
  const { rows } = await pool.query<{ role: Role; total: number; active: number; online: number }>(
    `SELECT role, COUNT(*)::int AS total, COUNT(*) FILTER (WHERE active)::int AS active,
       COUNT(*) FILTER (WHERE last_login_at >= now() - interval '1 day')::int AS online
     FROM users GROUP BY role`,
  );
  return rows;
}
