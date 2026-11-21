import { pool } from "../../core/db.js";

/** Flat read-only datasets for BI tools (Power BI, Excel, Google Sheets) and 1C pull. */
const DATASETS = {
  orders: {
    label: "Buyurtmalar",
    dated: "o.created_at",
    sql: `SELECT o.id, o.number, o.status, o.created_at, o.updated_at, o.subtotal, o.discount_pct, o.total,
            c.id AS client_id, c.name AS client_name, c.region, c.segment,
            w.code AS warehouse_code, w.name AS warehouse_name, u.full_name AS agent_name
          FROM orders o JOIN clients c ON c.id = o.client_id JOIN warehouses w ON w.id = o.warehouse_id
          LEFT JOIN users u ON u.id = o.agent_id`,
  },
  order_items: {
    label: "Buyurtma qatorlari",
    dated: "o.created_at",
    sql: `SELECT i.id, o.id AS order_id, o.number, o.status, o.created_at, p.sku, p.name AS product_name, p.category,
            i.quantity, i.price, i.quantity * i.price AS amount, i.quantity * p.cost AS cost_amount
          FROM order_items i JOIN orders o ON o.id = i.order_id JOIN products p ON p.id = i.product_id`,
  },
  clients: {
    label: "Mijozlar",
    dated: "c.created_at",
    sql: `SELECT c.id, c.name, c.owner_name, c.phone, c.region, c.address, c.segment, c.credit_limit, c.balance,
            u.full_name AS agent_name, c.created_at
          FROM clients c LEFT JOIN users u ON u.id = c.agent_id`,
  },
  products: {
    label: "Tovarlar",
    dated: "p.created_at",
    sql: `SELECT p.id, p.sku, p.name, p.category, p.unit, p.weight_kg, p.price, p.cost, p.min_stock, p.expires_at, p.active, p.created_at
          FROM products p`,
  },
  stock: {
    label: "Qoldiqlar",
    dated: null,
    sql: `SELECT w.code AS warehouse_code, w.name AS warehouse_name, p.sku, p.name AS product_name, p.category,
            s.quantity, s.reserved, s.quantity - s.reserved AS available, s.quantity * p.cost AS stock_value
          FROM stock s JOIN warehouses w ON w.id = s.warehouse_id JOIN products p ON p.id = s.product_id`,
  },
  movements: {
    label: "Ombor harakatlari",
    dated: "m.created_at",
    sql: `SELECT m.id, m.type, m.created_at, w.code AS warehouse_code, tw.code AS to_warehouse_code, p.sku,
            p.name AS product_name, m.quantity, m.reference, m.note
          FROM stock_movements m JOIN warehouses w ON w.id = m.warehouse_id
          LEFT JOIN warehouses tw ON tw.id = m.to_warehouse_id JOIN products p ON p.id = m.product_id`,
  },
  payments: {
    label: "To'lovlar",
    dated: "p.created_at",
    sql: `SELECT p.id, p.created_at, p.amount, p.method, c.id AS client_id, c.name AS client_name, c.region,
            o.number AS order_number, p.note
          FROM payments p JOIN clients c ON c.id = p.client_id LEFT JOIN orders o ON o.id = p.order_id`,
  },
  deliveries: {
    label: "Yetkazishlar",
    dated: "d.created_at",
    sql: `SELECT d.id, o.number AS order_number, d.status, d.scheduled_at, d.delivered_at, d.vehicle,
            u.full_name AS courier_name, c.name AS client_name, c.region
          FROM deliveries d JOIN orders o ON o.id = d.order_id JOIN clients c ON c.id = o.client_id
          LEFT JOIN users u ON u.id = d.courier_id`,
  },
} as const;

export type Dataset = keyof typeof DATASETS;
export const DATASET_NAMES = Object.keys(DATASETS) as Dataset[];
export const datasetLabel = (d: Dataset) => DATASETS[d].label;
export const isDataset = (d: string): d is Dataset => d in DATASETS;

const MAX_ROWS = 100_000;

export async function readDataset(name: Dataset, range: { from?: string; to?: string } = {}) {
  const d = DATASETS[name];
  const where = d.dated ? `WHERE ($1::date IS NULL OR ${d.dated} >= $1::date) AND ($2::date IS NULL OR ${d.dated} < $2::date + 1)` : "";
  const params = d.dated ? [range.from ?? null, range.to ?? null] : [];
  const { rows } = await pool.query(`${d.sql} ${where} LIMIT ${MAX_ROWS}`, params);
  return rows as Record<string, unknown>[];
}

const cell = (v: unknown, sep: string) => {
  if (v === null || v === undefined) return "";
  const s = v instanceof Date ? v.toISOString() : String(v);
  return s.includes(sep) || /["\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: Record<string, unknown>[], sep = ",", columns?: string[]): string {
  const cols = columns ?? Object.keys(rows[0] ?? {});
  return [cols.join(sep), ...rows.map((r) => cols.map((c) => cell(r[c], sep)).join(sep))].join("\r\n") + "\r\n";
}
