import { pool, type Db } from "../../../core/db.js";
import { notFound } from "../../../core/http.js";
import { activeOf } from "../repository.js";
import { ctxOf } from "../service.js";

export interface Account {
  client_id: number;
  order_id: number | null;
  /** Exact sum required when paying a specific order. */
  due: number | null;
  name: string;
}

/** Payer account: order number `TF-000123` (pays that order) or client ID (pays down debt). */
export async function resolveAccount(db: Db, value: unknown): Promise<Account | undefined> {
  const v = String(value ?? "").trim();
  if (/^TF-\d+$/.test(v)) {
    const { rows } = await db.query<{ id: number; client_id: number; total: number; name: string; paid: number }>(
      `SELECT o.id, o.client_id, o.total, c.name,
         COALESCE((SELECT SUM(amount) FROM payments p WHERE p.order_id = o.id), 0) AS paid
       FROM orders o JOIN clients c ON c.id = o.client_id WHERE o.number = $1 AND o.status <> 'cancelled'`,
      [v],
    );
    const o = rows[0];
    return o && { client_id: o.client_id, order_id: o.id, due: Math.max(0, o.total - o.paid), name: o.name };
  }
  if (!/^\d{1,9}$/.test(v)) return undefined;
  const { rows } = await db.query<{ id: number; name: string }>(`SELECT id, name FROM clients WHERE id = $1`, [Number(v)]);
  return rows[0] && { client_id: rows[0].id, order_id: null, due: null, name: rows[0].name };
}

export async function paymentLinks(q: { client_id: number; amount: number; order_number?: string }) {
  const { rows: client } = await pool.query(`SELECT id FROM clients WHERE id = $1`, [q.client_id]);
  if (!client[0]) throw notFound("Mijoz topilmadi");
  const account = q.order_number ?? String(q.client_id);
  return (await activeOf(["payme", "click"])).map((row) => {
    const { config } = ctxOf(row).ctx;
    if (row.provider === "payme") {
      const field = config.account_field || "client_id";
      const params = `m=${config.merchant_id};ac.${field}=${account};a=${Math.round(q.amount * 100)}`;
      const host = config.test_mode === "yes" ? "https://checkout.test.paycom.uz" : "https://checkout.paycom.uz";
      return { provider: "payme", name: row.name, url: `${host}/${Buffer.from(params).toString("base64")}` };
    }
    const url = new URL("https://my.click.uz/services/pay");
    url.search = new URLSearchParams({ service_id: config.service_id, merchant_id: config.merchant_id, amount: q.amount.toFixed(2), transaction_param: account }).toString();
    return { provider: "click", name: row.name, url: url.toString() };
  });
}
