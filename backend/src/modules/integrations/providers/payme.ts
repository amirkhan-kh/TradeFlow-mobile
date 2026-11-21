import { timingSafeEqual } from "node:crypto";
import { pool, tx, type Db } from "../../../core/db.js";
import { record, revert } from "../../payments/service.js";
import type { IntegrationRow } from "../repository.js";
import { ctxOf } from "../service.js";
import type { Provider } from "../types.js";
import { resolveAccount } from "./checkout.js";

export const payme: Provider = {
  key: "payme",
  name: "Payme",
  category: "payments",
  description:
    "Mijoz Payme orqali qarzini yoki aniq buyurtmani to'laydi: to'lov avtomatik “Moliya”ga tushadi va qarz kamayadi. To'lov havolasini mijoz kartochkasidan yuborish mumkin.",
  vendors: "Payme Business (Merchant API)",
  docs: "https://developer.help.paycom.uz/",
  fields: [
    { key: "merchant_id", label: "Kassa ID (merchant_id)", type: "text", required: true },
    { key: "key", label: "Kassa kaliti (KEY)", type: "password", required: true, help: "Test rejimda test kalitini kiriting" },
    {
      key: "account_field",
      label: "Hisob maydoni nomi",
      type: "text",
      placeholder: "client_id",
      help: "Payme kabinetidagi rekvizit nomi. Qiymat: mijoz ID yoki buyurtma raqami TF-000123",
    },
    {
      key: "test_mode",
      label: "Rejim",
      type: "select",
      options: [
        { value: "no", label: "Ishchi" },
        { value: "yes", label: "Test (checkout.test.paycom.uz)" },
      ],
    },
  ],
  events: [],
  endpoints: [{ label: "Merchant API endpoint (Payme kabinetiga)", method: "POST", path: "payme", hint: "Payme Business → Kassa → Sozlamalar → Endpoint URL" }],
  async test({ config }) {
    return `Kassa ${config.merchant_id}: endpoint URL'ni Payme kabinetiga kiriting va Sandbox'da tekshiring`;
  },
};

const TIMEOUT_MS = 43_200_000;

const msg = (ru: string, uz: string, en: string) => ({ ru, uz, en });
const E = {
  auth: { code: -32504, message: msg("Недостаточно привилегий", "Ruxsat yo'q", "Insufficient privilege") },
  rpc: { code: -32600, message: msg("Неверный запрос", "So'rov noto'g'ri", "Invalid request") },
  method: { code: -32601, message: msg("Метод не найден", "Metod topilmadi", "Method not found") },
  amount: { code: -31001, message: msg("Неверная сумма", "Summa noto'g'ri", "Incorrect amount") },
  notFound: { code: -31003, message: msg("Транзакция не найдена", "Tranzaksiya topilmadi", "Transaction not found") },
  cantPerform: { code: -31008, message: msg("Невозможно выполнить операцию", "Amalni bajarib bo'lmaydi", "Unable to perform operation") },
  account: { code: -31050, message: msg("Счёт не найден", "Hisob topilmadi", "Account not found") },
  busy: { code: -31099, message: msg("Заказ уже оплачивается", "Buyurtma to'lanmoqda", "Order is being paid") },
  system: { code: -32400, message: msg("Системная ошибка", "Tizim xatosi", "System error") },
};

class RpcError extends Error {
  constructor(
    public body: { code: number; message: object },
    public data?: string,
  ) {
    super(String(body.code));
  }
}

interface Txn {
  id: number;
  external_id: string;
  client_id: number;
  order_id: number | null;
  amount: number;
  state: number;
  reason: number | null;
  payment_id: number | null;
  create_time: number;
  perform_time: number;
  cancel_time: number;
}

type Params = { id?: string; time?: number; amount?: number; account?: Record<string, unknown>; reason?: number; from?: number; to?: number };

const view = (t: Txn) => ({
  create_time: Number(t.create_time),
  perform_time: Number(t.perform_time),
  cancel_time: Number(t.cancel_time),
  transaction: String(t.id),
  state: t.state,
  reason: t.reason,
});

async function find(db: Db, id: unknown, lock = false) {
  const { rows } = await db.query<Txn>(`SELECT * FROM payment_transactions WHERE provider='payme' AND external_id=$1 ${lock ? "FOR UPDATE" : ""}`, [String(id)]);
  return rows[0];
}

async function checkAccount(db: Db, field: string, p: Params) {
  const tiyin = Number(p.amount);
  if (!Number.isInteger(tiyin) || tiyin < 100) throw new RpcError(E.amount);
  const acc = await resolveAccount(db, p.account?.[field]);
  if (!acc) throw new RpcError(E.account, field);
  const amount = tiyin / 100;
  if (acc.order_id !== null && Math.abs((acc.due ?? 0) - amount) > 0.009) throw new RpcError(E.amount);
  return { acc, amount };
}

const EXPIRED = Symbol("expired");

/** Cancels a transaction older than 12h; the caller commits, then answers -31008. */
async function expire(db: Db, t: Txn) {
  if (Date.now() - Number(t.create_time) <= TIMEOUT_MS) return false;
  await db.query(`UPDATE payment_transactions SET state=-1, reason=4, cancel_time=$2 WHERE id=$1`, [t.id, Date.now()]);
  return true;
}

const unlessExpired = <T>(r: T | typeof EXPIRED) => {
  if (r === EXPIRED) throw new RpcError(E.cantPerform);
  return r;
};

async function dispatch(row: IntegrationRow, field: string, method: string, p: Params) {
  switch (method) {
    case "CheckPerformTransaction": {
      const { acc } = await checkAccount(pool, field, p);
      return { allow: true, additional: { client: acc.name } };
    }
    case "CreateTransaction":
      return tx(async (db) => {
        const existing = await find(db, p.id, true);
        if (existing) {
          if (existing.state !== 1) throw new RpcError(E.cantPerform);
          if (await expire(db, existing)) return EXPIRED;
          return { create_time: Number(existing.create_time), transaction: String(existing.id), state: 1 };
        }
        const { acc, amount } = await checkAccount(db, field, p);
        if (acc.order_id !== null) {
          const busy = await db.query(`SELECT 1 FROM payment_transactions WHERE provider='payme' AND order_id=$1 AND state=1`, [acc.order_id]);
          if (busy.rowCount) throw new RpcError(E.busy, field);
        }
        const { rows } = await db.query<Txn>(
          `INSERT INTO payment_transactions (integration_id, provider, external_id, client_id, order_id, amount, state, create_time)
           VALUES ($1,'payme',$2,$3,$4,$5,1,$6) RETURNING *`,
          [row.id, String(p.id), acc.client_id, acc.order_id, amount, Number(p.time) || Date.now()],
        );
        return { create_time: Number(rows[0].create_time), transaction: String(rows[0].id), state: 1 };
      }).then(unlessExpired);
    case "PerformTransaction":
      return tx(async (db) => {
        const t = await find(db, p.id, true);
        if (!t) throw new RpcError(E.notFound);
        if (t.state === 2) return { transaction: String(t.id), perform_time: Number(t.perform_time), state: 2 };
        if (t.state !== 1) throw new RpcError(E.cantPerform);
        if (await expire(db, t)) return EXPIRED;
        const payment = await record(db, { client_id: t.client_id, order_id: t.order_id, amount: t.amount, method: "payme", note: `Payme ${t.external_id}` }, null);
        const now = Date.now();
        await db.query(`UPDATE payment_transactions SET state=2, perform_time=$2, payment_id=$3 WHERE id=$1`, [t.id, now, payment.id]);
        return { transaction: String(t.id), perform_time: now, state: 2 };
      }).then(unlessExpired);
    case "CancelTransaction":
      return tx(async (db) => {
        const t = await find(db, p.id, true);
        if (!t) throw new RpcError(E.notFound);
        if (t.state < 0) return { transaction: String(t.id), cancel_time: Number(t.cancel_time), state: t.state };
        const state = t.state === 2 ? -2 : -1;
        if (t.payment_id) await revert(db, t.payment_id);
        const now = Date.now();
        await db.query(`UPDATE payment_transactions SET state=$2, reason=$3, cancel_time=$4, payment_id=NULL WHERE id=$1`, [t.id, state, p.reason ?? null, now]);
        return { transaction: String(t.id), cancel_time: now, state };
      });
    case "CheckTransaction": {
      const t = await find(pool, p.id);
      if (!t) throw new RpcError(E.notFound);
      return view(t);
    }
    case "GetStatement": {
      const { rows } = await pool.query<Txn & { account: string }>(
        `SELECT t.*, COALESCE(o.number, t.client_id::text) AS account FROM payment_transactions t LEFT JOIN orders o ON o.id = t.order_id
         WHERE t.provider='payme' AND t.integration_id=$1 AND t.create_time BETWEEN $2 AND $3 ORDER BY t.create_time`,
        [row.id, Number(p.from) || 0, Number(p.to) || Date.now()],
      );
      return {
        transactions: rows.map((t) => ({ id: t.external_id, time: Number(t.create_time), amount: Math.round(t.amount * 100), account: { [field]: t.account }, ...view(t) })),
      };
    }
    case "SetFiscalData":
      return { success: true };
    default:
      throw new RpcError(E.method, method);
  }
}

/** Payme Merchant API (JSON-RPC 2.0): always HTTP 200, failures in `error`. */
export async function handlePayme(row: IntegrationRow, authorization: string | undefined, body: unknown) {
  const req = (body ?? {}) as { id?: unknown; method?: unknown; params?: Params };
  const id = req.id ?? null;
  try {
    const { config } = ctxOf(row).ctx;
    const expected = Buffer.from(`Basic ${Buffer.from(`Paycom:${config.key}`).toString("base64")}`);
    const given = Buffer.from(authorization ?? "");
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new RpcError(E.auth);
    if (typeof req.method !== "string" || typeof req.params !== "object" || req.params === null) throw new RpcError(E.rpc);
    return { jsonrpc: "2.0", id, result: await dispatch(row, config.account_field || "client_id", req.method, req.params) };
  } catch (err) {
    if (err instanceof RpcError) return { jsonrpc: "2.0", id, error: { ...err.body, data: err.data } };
    console.error("payme:", err);
    return { jsonrpc: "2.0", id, error: E.system };
  }
}
