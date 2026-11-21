import { pool, tx } from "../../core/db.js";
import type { Config } from "./types.js";

export interface IntegrationRow {
  id: number;
  provider: string;
  name: string;
  config: Config;
  events: string[];
  token: string;
  active: boolean;
  last_sync_at: string | null;
  last_error: string | null;
  created_at: string;
}

export interface JobRow {
  id: number;
  integration_id: number;
  event: string;
  payload: unknown;
  attempts: number;
}

export async function list() {
  const { rows } = await pool.query(
    `SELECT i.*,
       COUNT(j.*) FILTER (WHERE j.status = 'pending')::int AS pending_jobs,
       COUNT(j.*) FILTER (WHERE j.status = 'failed')::int AS failed_jobs,
       COUNT(j.*) FILTER (WHERE j.status = 'done' AND j.done_at >= now() - interval '1 day')::int AS sent_today
     FROM integrations i LEFT JOIN integration_jobs j ON j.integration_id = i.id
     GROUP BY i.id ORDER BY i.created_at`,
  );
  return rows as (IntegrationRow & { pending_jobs: number; failed_jobs: number; sent_today: number })[];
}

export async function get(id: number) {
  const { rows } = await pool.query<IntegrationRow>(`SELECT * FROM integrations WHERE id = $1`, [id]);
  return rows[0];
}

export async function byToken(token: string) {
  const { rows } = await pool.query<IntegrationRow>(`SELECT * FROM integrations WHERE token = $1 AND active`, [token]);
  return rows[0];
}

export async function activeOf(providers: string[]) {
  const { rows } = await pool.query<IntegrationRow>(`SELECT * FROM integrations WHERE active AND provider = ANY($1) ORDER BY id`, [providers]);
  return rows;
}

export async function insert(i: Pick<IntegrationRow, "provider" | "name" | "config" | "events" | "token" | "active">) {
  const { rows } = await pool.query<IntegrationRow>(
    `INSERT INTO integrations (provider, name, config, events, token, active) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [i.provider, i.name, i.config, i.events, i.token, i.active],
  );
  return rows[0];
}

export async function update(id: number, i: Pick<IntegrationRow, "name" | "config" | "events" | "active">) {
  const { rows } = await pool.query<IntegrationRow>(
    `UPDATE integrations SET name=$2, config=$3, events=$4, active=$5 WHERE id=$1 RETURNING *`,
    [id, i.name, i.config, i.events, i.active],
  );
  return rows[0];
}

export async function remove(id: number) {
  const { rowCount } = await pool.query(`DELETE FROM integrations WHERE id = $1`, [id]);
  return Boolean(rowCount);
}

export async function setToken(id: number, token: string) {
  const { rows } = await pool.query<IntegrationRow>(`UPDATE integrations SET token=$2 WHERE id=$1 RETURNING *`, [id, token]);
  return rows[0];
}

export async function markResult(id: number, error: string | null, synced = false) {
  await pool.query(
    `UPDATE integrations SET last_error = $2, last_sync_at = CASE WHEN $3 THEN now() ELSE last_sync_at END WHERE id = $1`,
    [id, error, synced],
  );
}

export async function jobs(id: number) {
  const { rows } = await pool.query(
    `SELECT id, event, status, attempts, last_error, created_at, done_at, next_run_at FROM integration_jobs
     WHERE integration_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [id],
  );
  return rows;
}

export async function retryJob(id: number, jobId: number) {
  const { rowCount } = await pool.query(
    `UPDATE integration_jobs SET status='pending', attempts=0, next_run_at=now(), last_error=NULL
     WHERE id=$2 AND integration_id=$1 AND status='failed'`,
    [id, jobId],
  );
  return Boolean(rowCount);
}

export async function calls(id: number) {
  const { rows } = await pool.query(
    `SELECT k.*, c.name AS client_name, l.name AS lead_name FROM calls k
     LEFT JOIN clients c ON c.id = k.client_id LEFT JOIN leads l ON l.id = k.lead_id
     WHERE k.integration_id = $1 ORDER BY k.created_at DESC LIMIT 50`,
    [id],
  );
  return rows;
}

export async function getLink(id: number, entity: string, entityId: number) {
  const { rows } = await pool.query<{ external_id: string }>(
    `SELECT external_id FROM integration_links WHERE integration_id=$1 AND entity=$2 AND entity_id=$3`,
    [id, entity, entityId],
  );
  return rows[0]?.external_id;
}

export async function setLink(id: number, entity: string, entityId: number, externalId: string) {
  await pool.query(
    `INSERT INTO integration_links (integration_id, entity, entity_id, external_id) VALUES ($1,$2,$3,$4)
     ON CONFLICT (integration_id, entity, entity_id) DO UPDATE SET external_id = EXCLUDED.external_id`,
    [id, entity, entityId, externalId],
  );
}

/** Leases due jobs for 5 minutes so parallel workers never send the same job twice. */
export function claimDue(limit: number) {
  return tx(async (db) => {
    const { rows } = await db.query<JobRow>(
      `UPDATE integration_jobs SET next_run_at = now() + interval '5 minutes'
       WHERE id IN (
         SELECT j.id FROM integration_jobs j JOIN integrations i ON i.id = j.integration_id
         WHERE j.status = 'pending' AND j.next_run_at <= now() AND i.active
         ORDER BY j.id LIMIT $1 FOR UPDATE OF j SKIP LOCKED)
       RETURNING id, integration_id, event, payload, attempts`,
      [limit],
    );
    return rows;
  });
}

export async function finishJob(jobId: number) {
  await pool.query(`UPDATE integration_jobs SET status='done', done_at=now(), last_error=NULL, attempts=attempts+1 WHERE id=$1`, [jobId]);
}

export async function failJob(jobId: number, error: string, final: boolean, retryInSec: number) {
  await pool.query(
    `UPDATE integration_jobs SET attempts = attempts + 1, last_error = $2,
       status = CASE WHEN $3 THEN 'failed' ELSE 'pending' END,
       next_run_at = now() + make_interval(secs => $4)
     WHERE id = $1`,
    [jobId, error, final, retryInSec],
  );
}
