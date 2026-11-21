import type { Db } from "../../core/db.js";
import { HttpError } from "../../core/http.js";
import { recordMovement, setQuantity } from "../stock/repository.js";

/** Sets absolute quantities from an external master; each difference is an `adjust` movement. */
export async function setStockBySku(db: Db, warehouseCode: string, items: { sku: string; quantity: number }[], reference: string, note: string) {
  const w = await db.query<{ id: number }>(`SELECT id FROM warehouses WHERE code = $1`, [warehouseCode]);
  if (!w.rows[0]) throw new HttpError(422, `Ombor kodi topilmadi: ${warehouseCode}`);
  const { rows } = await db.query<{ id: number; sku: string }>(`SELECT id, sku FROM products WHERE sku = ANY($1)`, [items.map((i) => i.sku)]);
  const ids = new Map(rows.map((p) => [p.sku, p.id]));
  const skipped: string[] = [];
  let changed = 0;
  for (const item of items) {
    const productId = ids.get(item.sku);
    if (!productId) {
      skipped.push(item.sku);
      continue;
    }
    const delta = await setQuantity(db, w.rows[0].id, productId, Math.max(0, Math.floor(item.quantity)));
    if (delta !== 0) {
      changed++;
      await recordMovement(db, { type: "adjust", warehouse_id: w.rows[0].id, product_id: productId, quantity: delta, reference, note });
    }
  }
  return { changed, unchanged: items.length - changed - skipped.length, skipped };
}

/** Free stock per SKU: one warehouse by code, or all warehouses. */
export async function availableBySku(db: Db, warehouseCode?: string) {
  const { rows } = await db.query<{ sku: string; available: number }>(
    `SELECT p.sku, COALESCE(SUM(s.quantity - s.reserved), 0)::int AS available
     FROM products p LEFT JOIN stock s ON s.product_id = p.id
       AND ($1::text IS NULL OR s.warehouse_id = (SELECT id FROM warehouses WHERE code = $1))
     WHERE p.active GROUP BY p.sku`,
    [warehouseCode || null],
  );
  return new Map(rows.map((r) => [r.sku, r.available]));
}
