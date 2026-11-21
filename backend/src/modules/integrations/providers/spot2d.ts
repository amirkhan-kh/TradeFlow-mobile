import { pool } from "../../../core/db.js";
import { toCsv } from "../feeds.js";
import { basicAuth, request } from "../net.js";
import type { Config, Provider } from "../types.js";

/**
 * Spot2D distributor exchange: 7 semicolon-separated UTF-8 CSV files over a rolling window.
 * Column sets follow the common 1C→Spot2D exporters; confirm the exact layout with Spot2D support.
 */
const FILES = {
  "sku.csv": {
    label: "Nomenklatura",
    sql: `SELECT $1::text AS distributor_code, p.sku, p.name, p.category, p.unit, p.weight_kg, p.price FROM products p WHERE p.active ORDER BY p.sku`,
    dated: false,
  },
  "stocks.csv": {
    label: "Qoldiqlar",
    sql: `SELECT $1::text AS distributor_code, current_date AS date, w.code AS warehouse_code, w.name AS warehouse_name, p.sku, s.quantity
          FROM stock s JOIN warehouses w ON w.id = s.warehouse_id JOIN products p ON p.id = s.product_id WHERE s.quantity > 0 ORDER BY w.code, p.sku`,
    dated: false,
  },
  "delivery.csv": {
    label: "Sotuvlar (jo'natilgan)",
    sql: `SELECT $1::text AS distributor_code, o.number AS doc_number, o.updated_at::date AS doc_date, o.client_id AS outlet_id, o.agent_id AS ta_id,
            w.code AS warehouse_code, p.sku, i.quantity, i.price, ROUND(i.quantity * i.price * (1 - o.discount_pct / 100), 2) AS amount
          FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id JOIN warehouses w ON w.id = o.warehouse_id
          WHERE o.status IN ('shipped','delivered') AND o.updated_at >= current_date - $2::int ORDER BY o.updated_at`,
    dated: true,
  },
  "receive.csv": {
    label: "Kirimlar",
    sql: `SELECT $1::text AS distributor_code, m.id AS doc_id, m.created_at::date AS doc_date, w.code AS warehouse_code, p.sku, m.quantity
          FROM stock_movements m JOIN warehouses w ON w.id = m.warehouse_id JOIN products p ON p.id = m.product_id
          WHERE m.type = 'in' AND m.created_at >= current_date - $2::int ORDER BY m.created_at`,
    dated: true,
  },
  "cancellations.csv": {
    label: "Bekor va tuzatishlar",
    sql: `SELECT $1::text AS distributor_code, o.number AS doc_number, o.updated_at::date AS doc_date, o.client_id AS outlet_id, p.sku, i.quantity, 'cancelled' AS reason
          FROM orders o JOIN order_items i ON i.order_id = o.id JOIN products p ON p.id = i.product_id
          WHERE o.status = 'cancelled' AND o.updated_at >= current_date - $2::int
          UNION ALL
          SELECT $1::text, m.reference, m.created_at::date, NULL, p.sku, m.quantity, 'adjust'
          FROM stock_movements m JOIN products p ON p.id = m.product_id
          WHERE m.type = 'adjust' AND m.created_at >= current_date - $2::int
          ORDER BY 3`,
    dated: true,
  },
  "ta.csv": {
    label: "Savdo agentlari",
    sql: `SELECT $1::text AS distributor_code, u.id AS ta_id, u.full_name, u.phone, u.region FROM users u WHERE u.role = 'agent' AND u.active ORDER BY u.id`,
    dated: false,
  },
  "ttoptions.csv": {
    label: "Savdo nuqtalari",
    sql: `SELECT $1::text AS distributor_code, c.id AS outlet_id, c.name, c.owner_name, c.phone, c.region, c.address, c.segment, c.agent_id AS ta_id
          FROM clients c ORDER BY c.id`,
    dated: false,
  },
} as const;

export type Spot2dFile = keyof typeof FILES;
export const isSpot2dFile = (f: string): f is Spot2dFile => f in FILES;

export async function spot2dCsv(config: Config, file: Spot2dFile) {
  const f = FILES[file];
  const days = Math.min(Math.max(Number(config.days) || 45, 1), 365);
  const { rows, fields } = await pool.query(f.sql, f.dated ? [config.distributor_code, days] : [config.distributor_code]);
  return toCsv(rows, ";", fields.map((x) => x.name));
}

export const spot2d: Provider = {
  key: "spot2d",
  name: "Spot2D",
  category: "distribution",
  description:
    "Ishlab chiqaruvchiga distribyutsiya hisoboti: sotuv, qoldiq, kirim, savdo nuqtalari va agentlar 7 ta CSV faylda. Faylni URL orqali olish yoki “Sinxronlash” bilan Spot2D serveriga yuklash.",
  vendors: "Spot2D distributor exchange",
  docs: "https://asu-plus.com/docs/spot2d/",
  fields: [
    { key: "distributor_code", label: "Distribyutor kodi", type: "text", required: true, help: "Spot2D texnik yordami beradi" },
    { key: "upload_url", label: "Yuklash URL (ixtiyoriy)", type: "url", placeholder: "https://…spot2d…/upload" },
    { key: "username", label: "Foydalanuvchi", type: "text" },
    { key: "password", label: "Parol", type: "password" },
    { key: "days", label: "Davr, kun", type: "number", placeholder: "45" },
  ],
  events: [],
  endpoints: (Object.keys(FILES) as Spot2dFile[]).map((f) => ({ label: `${FILES[f].label} (${f})`, method: "GET" as const, path: `spot2d/${f}` })),
  async test({ config }) {
    const csv = await spot2dCsv(config, "sku.csv");
    return `Fayllar tayyor: sku.csv — ${csv.split("\r\n").length - 2} qator`;
  },
  async sync({ config }) {
    if (!config.upload_url) throw new Error("Yuklash URL kiritilmagan — fayllarni URL'lar orqali yuklab oling");
    const form = new FormData();
    form.append("distributor_code", config.distributor_code);
    for (const f of Object.keys(FILES) as Spot2dFile[]) {
      form.append("files", new Blob([await spot2dCsv(config, f)], { type: "text/csv" }), f);
    }
    const headers: Record<string, string> = config.username ? { authorization: basicAuth(config.username, config.password ?? "") } : {};
    await request(config.upload_url, { method: "POST", body: form, headers, timeoutMs: 120_000 });
    return `${Object.keys(FILES).length} ta fayl yuklandi`;
  },
};
