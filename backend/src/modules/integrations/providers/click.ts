import { createHash, timingSafeEqual } from "node:crypto";
import { tx } from "../../../core/db.js";
import { record } from "../../payments/service.js";
import type { IntegrationRow } from "../repository.js";
import { ctxOf } from "../service.js";
import type { Provider } from "../types.js";
import { resolveAccount } from "./checkout.js";

export const click: Provider = {
  key: "click",
  name: "Click",
  category: "payments",
  description:
    "Click Up / Click Evolution orqali to'lov: Prepare va Complete so'rovlari imzo bilan tekshiriladi, to'lov “Moliya”ga tushadi va mijoz qarzi kamayadi.",
  vendors: "Click Merchant (SHOP API)",
  docs: "https://docs.click.uz/click-api-request/",
  fields: [
    { key: "service_id", label: "Service ID", type: "text", required: true },
    { key: "merchant_id", label: "Merchant ID", type: "text", required: true },
    { key: "merchant_user_id", label: "Merchant user ID", type: "text" },
    { key: "secret_key", label: "Secret key", type: "password", required: true },
  ],
  events: [],
  endpoints: [
    { label: "Prepare URL", method: "POST", path: "click/prepare", hint: "Click kabineti → Servis → Prepare URL" },
    { label: "Complete URL", method: "POST", path: "click/complete", hint: "Click kabineti → Servis → Complete URL. transaction_param = mijoz ID yoki TF-000123" },
  ],
  async test({ config }) {
    return `Servis ${config.service_id}: Prepare va Complete URL'larni Click kabinetiga kiriting`;
  },
};

type Body = Record<string, string | undefined>;
const reply = (b: Body, error: number, error_note: string, extra: Record<string, unknown> = {}) => ({
  click_trans_id: b.click_trans_id,
  merchant_trans_id: b.merchant_trans_id,
  ...extra,
  error,
  error_note,
});

function signed(b: Body, secret: string, complete: boolean) {
  const raw = [b.click_trans_id, b.service_id, secret, b.merchant_trans_id, complete ? b.merchant_prepare_id : "", b.amount, b.action, b.sign_time].map((x) => x ?? "").join("");
  const expected = Buffer.from(createHash("md5").update(raw).digest("hex"));
  const given = Buffer.from(String(b.sign_string ?? "").toLowerCase());
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** Click SHOP API: action=0 Prepare, action=1 Complete. Errors are business codes in a 200 body. */
export async function handleClick(row: IntegrationRow, step: "prepare" | "complete", body: Body) {
  const { config } = ctxOf(row).ctx;
  const complete = step === "complete";
  if (!body.click_trans_id || !body.merchant_trans_id || !body.amount || !body.sign_time) return reply(body, -8, "Error in request from click");
  if (!signed(body, config.secret_key, complete) || body.service_id !== config.service_id) return reply(body, -1, "SIGN CHECK FAILED!");
  if (body.action !== (complete ? "1" : "0")) return reply(body, -3, "Action not found");
  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) return reply(body, -2, "Incorrect parameter amount");

  return tx(async (db) => {
    const acc = await resolveAccount(db, body.merchant_trans_id);
    if (!acc) return reply(body, -5, "User does not exist");
    if (acc.order_id !== null && Math.abs((acc.due ?? 0) - amount) > 0.009) return reply(body, acc.due === 0 ? -4 : -2, acc.due === 0 ? "Already paid" : "Incorrect parameter amount");

    const { rows } = await db.query<{ id: number; state: number; amount: number }>(
      `SELECT id, state, amount FROM payment_transactions WHERE provider='click' AND external_id=$1 FOR UPDATE`,
      [body.click_trans_id],
    );
    const t = rows[0];

    if (!complete) {
      if (t?.state === 2) return reply(body, -4, "Already paid");
      if (t?.state === -1) return reply(body, -9, "Transaction cancelled");
      const id =
        t?.id ??
        (
          await db.query<{ id: number }>(
            `INSERT INTO payment_transactions (integration_id, provider, external_id, client_id, order_id, amount, state, create_time)
             VALUES ($1,'click',$2,$3,$4,$5,1,$6) RETURNING id`,
            [row.id, body.click_trans_id, acc.client_id, acc.order_id, amount, Date.now()],
          )
        ).rows[0].id;
      return reply(body, 0, "Success", { merchant_prepare_id: id });
    }

    if (!t || String(t.id) !== String(body.merchant_prepare_id)) return reply(body, -6, "Transaction does not exist");
    if (t.state === 2) return reply(body, -4, "Already paid", { merchant_confirm_id: t.id });
    if (t.state === -1) return reply(body, -9, "Transaction cancelled");
    if (Math.abs(t.amount - amount) > 0.009) return reply(body, -2, "Incorrect parameter amount");
    if (Number(body.error) < 0) {
      await db.query(`UPDATE payment_transactions SET state=-1, reason=$2, cancel_time=$3 WHERE id=$1`, [t.id, Number(body.error), Date.now()]);
      return reply(body, -9, "Transaction cancelled");
    }
    const payment = await record(db, { client_id: acc.client_id, order_id: acc.order_id, amount, method: "click", note: `Click ${body.click_trans_id}` }, null);
    await db.query(`UPDATE payment_transactions SET state=2, perform_time=$2, payment_id=$3 WHERE id=$1`, [t.id, Date.now(), payment.id]);
    return reply(body, 0, "Success", { merchant_confirm_id: t.id });
  });
}
