import { tx, type Db } from "../../core/db.js";
import { conflict, HttpError, notFound } from "../../core/http.js";
import { changeBalance } from "../clients/repository.js";
import * as deliveries from "../deliveries/repository.js";
import { emit, orderPayload } from "../integrations/events.js";
import * as stock from "../stock/repository.js";
import { assertAssignee } from "../users/service.js";
import * as warehouses from "../warehouses/repository.js";
import * as repo from "./repository.js";
import type { OrderStatus } from "./repository.js";

export interface CreateOrderInput {
  client_id: number;
  warehouse_id: number;
  agent_id?: number | null;
  discount_pct: number;
  note?: string;
  items: { product_id: number; quantity: number }[];
}

const round = (n: number) => Math.round(n * 100) / 100;

export async function create(input: CreateOrderInput, userId: number) {
  return tx(async (db) => {
    const { rows } = await db.query<{ balance: number; credit_limit: number }>(
      `SELECT balance, credit_limit FROM clients WHERE id=$1 FOR UPDATE`,
      [input.client_id],
    );
    const client = rows[0];
    if (!client) throw notFound("Mijoz topilmadi");
    if (!(await warehouses.isActive(db, input.warehouse_id))) throw new HttpError(422, "Ombor topilmadi yoki faol emas");
    await assertAssignee(input.agent_id, ["agent"], db);

    const merged = new Map<number, number>();
    for (const i of input.items) merged.set(i.product_id, (merged.get(i.product_id) ?? 0) + i.quantity);
    const priceMap = await repo.prices(db, [...merged.keys()]);
    const lines = [...merged].map(([product_id, quantity]) => {
      const price = priceMap.get(product_id);
      if (price === undefined) throw new HttpError(422, `Tovar #${product_id} topilmadi yoki faol emas`);
      return { product_id, quantity, price };
    });

    const subtotal = round(lines.reduce((s, l) => s + l.quantity * l.price, 0));
    const total = round(subtotal * (1 - input.discount_pct / 100));
    if (client.credit_limit > 0 && client.balance + total > client.credit_limit) {
      throw conflict("Mijozning kredit limiti oshib ketadi. Avval qarzni undiring.");
    }

    const order = await repo.insert(
      db,
      {
        client_id: input.client_id,
        warehouse_id: input.warehouse_id,
        agent_id: input.agent_id ?? userId,
        discount_pct: input.discount_pct,
        subtotal,
        total,
        note: input.note,
      },
      lines,
    );
    await emit(db, "order.created", () => orderPayload(db, order.id));
    return order;
  });
}

const transitions: Record<OrderStatus, OrderStatus[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export interface StatusInput {
  status: OrderStatus;
  courier_id?: number | null;
  vehicle?: string;
}

/** Order state machine; stock + client balance move in the same transaction. */
export async function applyStatus(db: Db, id: number, input: StatusInput, userId: number | null, at?: Date) {
  const order = await repo.lock(db, id);
  if (!order) throw notFound("Buyurtma topilmadi");
  if (order.status === input.status) return order;
  if (!transitions[order.status].includes(input.status)) {
    throw conflict(`"${order.status}" holatidan "${input.status}" holatiga o'tib bo'lmaydi`);
  }
  const lines = await repo.items(db, id);

  if (input.status === "confirmed") {
    for (const l of lines) await stock.reserve(db, order.warehouse_id, l.product_id, l.quantity);
  }
  if (input.status === "cancelled" && order.status === "confirmed") {
    for (const l of lines) await stock.release(db, order.warehouse_id, l.product_id, l.quantity);
  }
  if (input.status === "shipped") {
    await assertAssignee(input.courier_id, ["courier"], db);
    for (const l of lines) {
      await stock.consumeReserved(db, order.warehouse_id, l.product_id, l.quantity);
      await stock.recordMovement(db, {
        type: "out",
        warehouse_id: order.warehouse_id,
        product_id: l.product_id,
        quantity: l.quantity,
        reference: order.number,
        user_id: userId,
        created_at: at,
      });
    }
    await changeBalance(db, order.client_id, order.total);
    await deliveries.ensure(db, order.id, input.courier_id ?? null, input.vehicle ?? null, at);
  }
  if (input.status === "delivered") {
    await deliveries.markDelivered(db, order.id, at);
  }

  await repo.setStatus(db, id, input.status, at);
  await emit(db, "order.status_changed", () => orderPayload(db, id, order.status));
  return { ...order, status: input.status };
}

export function changeStatus(id: number, input: StatusInput, userId: number) {
  return tx((db) => applyStatus(db, id, input, userId));
}
