import { tx } from "../../core/db.js";
import { HttpError } from "../../core/http.js";
import { emit, stockPayload } from "../integrations/events.js";
import * as warehouses from "../warehouses/repository.js";
import * as repo from "./repository.js";

export interface MoveInput {
  type: "in" | "out" | "transfer";
  warehouse_id: number;
  to_warehouse_id?: number;
  product_id: number;
  quantity: number;
  note?: string;
  idempotency_key?: string;
}

export async function move(input: MoveInput, userId: number) {
  if (input.idempotency_key) {
    const existing = await repo.findByKey(input.idempotency_key);
    if (existing) return existing;
  }
  if (input.type === "transfer" && (!input.to_warehouse_id || input.to_warehouse_id === input.warehouse_id)) {
    throw new HttpError(422, "Ko'chirish uchun boshqa omborni tanlang");
  }

  return tx(async (db) => {
    const target = input.type === "in" ? input.warehouse_id : input.type === "transfer" ? input.to_warehouse_id! : null;
    if (target && !(await warehouses.isActive(db, target))) throw new HttpError(422, "Ombor topilmadi yoki faol emas");
    if (input.type === "in") await repo.add(db, input.warehouse_id, input.product_id, input.quantity);
    if (input.type === "out") await repo.remove(db, input.warehouse_id, input.product_id, input.quantity);
    if (input.type === "transfer") {
      await repo.remove(db, input.warehouse_id, input.product_id, input.quantity);
      await repo.add(db, input.to_warehouse_id!, input.product_id, input.quantity);
    }
    const movement = await repo.recordMovement(db, { ...input, user_id: userId });
    await emit(db, "stock.moved", () => stockPayload(db, movement.id));
    return movement;
  });
}
