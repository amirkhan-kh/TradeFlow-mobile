import type { Db } from "../../core/db.js";
import type { ClientPayload, EventName, LeadPayload, OrderPayload, PaymentPayload, StockPayload } from "./types.js";

/**
 * Outbox: queues one job per active integration subscribed to `event`, inside the caller's
 * transaction, so a rolled-back write never notifies anyone. Payload is built only if someone listens.
 */
export async function emit(db: Db, event: EventName, build: () => Promise<object | undefined>) {
  const { rows } = await db.query<{ id: number }>(`SELECT id FROM integrations WHERE active AND $1 = ANY(events)`, [event]);
  if (!rows.length) return;
  const payload = await build();
  if (!payload) return;
  await db.query(
    `INSERT INTO integration_jobs (integration_id, event, payload) SELECT unnest($1::int[]), $2, $3`,
    [rows.map((r) => r.id), event, JSON.stringify(payload)],
  );
}

export async function orderPayload(db: Db, orderId: number, previousStatus?: string): Promise<OrderPayload | undefined> {
  const { rows } = await db.query(
    `SELECT json_build_object(
        'id', o.id, 'number', o.number, 'status', o.status, 'subtotal', o.subtotal, 'discount_pct', o.discount_pct,
        'total', o.total, 'note', o.note, 'created_at', o.created_at) AS "order",
      json_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'region', c.region, 'address', c.address) AS client,
      json_build_object('id', w.id, 'code', w.code, 'name', w.name) AS warehouse,
      (SELECT COALESCE(json_agg(json_build_object('product_id', p.id, 'sku', p.sku, 'name', p.name, 'quantity', i.quantity, 'price', i.price) ORDER BY i.id), '[]')
         FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = o.id) AS items
     FROM orders o JOIN clients c ON c.id = o.client_id JOIN warehouses w ON w.id = o.warehouse_id
     WHERE o.id = $1`,
    [orderId],
  );
  const p = rows[0] as OrderPayload | undefined;
  if (p && previousStatus) p.order.previous_status = previousStatus;
  return p;
}

export async function paymentPayload(db: Db, paymentId: number): Promise<PaymentPayload | undefined> {
  const { rows } = await db.query(
    `SELECT json_build_object('id', p.id, 'amount', p.amount, 'method', p.method, 'note', p.note, 'order_id', p.order_id, 'created_at', p.created_at) AS payment,
            json_build_object('id', c.id, 'name', c.name, 'phone', c.phone, 'balance', c.balance) AS client
     FROM payments p JOIN clients c ON c.id = p.client_id WHERE p.id = $1`,
    [paymentId],
  );
  return rows[0];
}

export async function clientPayload(db: Db, clientId: number): Promise<ClientPayload | undefined> {
  const { rows } = await db.query(
    `SELECT json_build_object('id', id, 'name', name, 'owner_name', owner_name, 'phone', phone, 'region', region,
       'address', address, 'inn', inn, 'segment', segment, 'credit_limit', credit_limit) AS client FROM clients WHERE id = $1`,
    [clientId],
  );
  return rows[0];
}

export async function leadPayload(db: Db, leadId: number): Promise<LeadPayload | undefined> {
  const { rows } = await db.query(
    `SELECT json_build_object('id', id, 'name', name, 'phone', phone, 'company', company, 'message', message) AS lead FROM leads WHERE id = $1`,
    [leadId],
  );
  return rows[0];
}

export async function stockPayload(db: Db, movementId: number): Promise<StockPayload | undefined> {
  const { rows } = await db.query(
    `SELECT json_build_object('id', m.id, 'type', m.type, 'quantity', m.quantity, 'note', m.note, 'created_at', m.created_at) AS movement,
            json_build_object('id', p.id, 'sku', p.sku, 'name', p.name) AS product,
            json_build_object('id', w.id, 'code', w.code, 'name', w.name) AS warehouse,
            CASE WHEN tw.id IS NULL THEN NULL ELSE json_build_object('id', tw.id, 'code', tw.code, 'name', tw.name) END AS to_warehouse
     FROM stock_movements m JOIN products p ON p.id = m.product_id JOIN warehouses w ON w.id = m.warehouse_id
     LEFT JOIN warehouses tw ON tw.id = m.to_warehouse_id WHERE m.id = $1`,
    [movementId],
  );
  return rows[0];
}
