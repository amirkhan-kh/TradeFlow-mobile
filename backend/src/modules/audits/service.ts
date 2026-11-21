import { tx, type Db } from "../../core/db.js";
import { conflict, HttpError, notFound } from "../../core/http.js";
import * as stock from "../stock/repository.js";
import { assertAssignee } from "../users/service.js";
import * as repo from "./repository.js";

/** Without an explicit auditor the manager who starts the audit runs it. */
export function create(input: { warehouse_id: number; auditor_id?: number | null; note?: string }, userId: number) {
  return tx(async (db) => {
    await assertAssignee(input.auditor_id, ["auditor"], db);
    return repo.insert(db, { ...input, auditor_id: input.auditor_id ?? userId });
  });
}

async function lockOpen(db: Db, id: number) {
  const audit = await repo.lock(db, id);
  if (!audit) throw notFound("Audit topilmadi");
  return audit;
}

export function saveCounts(id: number, counts: { product_id: number; counted: number | null }[]) {
  return tx(async (db) => {
    const audit = await lockOpen(db, id);
    if (audit.status !== "in_progress") throw conflict("Yakunlangan auditni o'zgartirib bo'lmaydi");
    await repo.setCounts(db, id, counts);
  });
}

export function complete(id: number) {
  return tx(async (db) => {
    const audit = await lockOpen(db, id);
    if (audit.status !== "in_progress") throw conflict("Audit allaqachon yakunlangan");
    const left = await repo.uncounted(db, id);
    if (left > 0) throw new HttpError(422, `${left} ta pozitsiya hali sanalmagan`);
    await repo.setStatus(db, id, "completed");
  });
}

/** Approval writes counted quantities to stock as `adjust` movements. */
export async function approveIn(db: Db, id: number, userId: number | null, at?: Date) {
  const audit = await lockOpen(db, id);
  if (audit.status !== "completed") throw conflict("Faqat yakunlangan audit tasdiqlanadi");
  for (const m of await repo.mismatches(db, id)) {
    const delta = await stock.setQuantity(db, audit.warehouse_id, m.product_id, m.counted);
    if (delta !== 0) {
      await stock.recordMovement(db, {
        type: "adjust",
        warehouse_id: audit.warehouse_id,
        product_id: m.product_id,
        quantity: delta,
        reference: audit.number,
        note: "Audit natijasi",
        user_id: userId,
        created_at: at,
      });
    }
  }
  await repo.setStatus(db, id, "approved", at);
}

export const approve = (id: number, userId: number) => tx((db) => approveIn(db, id, userId));
