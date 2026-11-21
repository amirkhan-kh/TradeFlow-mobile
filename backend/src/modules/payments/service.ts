import type { Db } from "../../core/db.js";
import { notFound } from "../../core/http.js";
import { changeBalance } from "../clients/repository.js";
import { emit, paymentPayload } from "../integrations/events.js";

export type Method = "cash" | "card" | "transfer" | "payme" | "click";

export interface PaymentInput {
  client_id: number;
  order_id?: number | null;
  amount: number;
  method: Method;
  note?: string;
}

/** Payment lowers the client's debt in the caller's transaction. */
export async function record(db: Db, input: PaymentInput, userId: number | null) {
  const { rowCount } = await db.query("SELECT 1 FROM clients WHERE id=$1 FOR UPDATE", [input.client_id]);
  if (!rowCount) throw notFound("Mijoz topilmadi");
  const { rows } = await db.query(
    `INSERT INTO payments (client_id, order_id, amount, method, note, user_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [input.client_id, input.order_id ?? null, input.amount, input.method, input.note ?? null, userId],
  );
  await changeBalance(db, input.client_id, -input.amount);
  await emit(db, "payment.created", () => paymentPayload(db, rows[0].id));
  return rows[0] as { id: number; amount: number; client_id: number };
}

/** Undo for a reversed online payment: debt comes back, row is removed. */
export async function revert(db: Db, paymentId: number) {
  const { rows } = await db.query<{ client_id: number; amount: number }>(`DELETE FROM payments WHERE id=$1 RETURNING client_id, amount`, [paymentId]);
  if (rows[0]) await changeBalance(db, rows[0].client_id, rows[0].amount);
}
