import { tx } from "../../../core/db.js";
import { upsertBySku } from "../../products/repository.js";
import { setStockBySku } from "../imports.js";
import { request } from "../net.js";
import type { Config, Provider } from "../types.js";

const API = "https://api.moysklad.ru/api/remap/1.2";

const get = <T>(config: Config, path: string) =>
  request<T>(`${API}${path}`, { headers: { authorization: `Bearer ${config.token}`, "accept-encoding": "gzip" }, timeoutMs: 60_000 }).then((r) => r.data);

interface Row {
  name: string;
  code?: string;
  article?: string;
  pathName?: string;
  weight?: number;
  archived?: boolean;
  salePrices?: { value: number; priceType?: { name: string } }[];
  buyPrice?: { value: number };
}

async function all<T>(config: Config, path: string) {
  const out: T[] = [];
  for (let offset = 0; ; offset += 1000) {
    const page = await get<{ rows: T[]; meta: { size: number } }>(config, `${path}${path.includes("?") ? "&" : "?"}limit=1000&offset=${offset}`);
    out.push(...page.rows);
    if (offset + 1000 >= page.meta.size) return out;
  }
}

export const moysklad: Provider = {
  key: "moysklad",
  name: "MoySklad (МойСклад)",
  category: "erp",
  description: "Tovarlar (artikul = SKU), sotuv va xarid narxlari, guruhlar import qilinadi; ixtiyoriy — qoldiqlar tanlangan omborga tenglashtiriladi.",
  vendors: "МойСклад JSON API 1.2",
  docs: "https://dev.moysklad.ru/doc/api/remap/1.2/",
  fields: [
    { key: "token", label: "API token", type: "password", required: true, help: "МойСклад → Sozlamalar → Foydalanuvchilar → Token" },
    { key: "price_type", label: "Narx turi nomi", type: "text", placeholder: "Цена продажи", help: "Bo'sh bo'lsa birinchi narx olinadi" },
    { key: "warehouse_code", label: "Qoldiq yoziladigan ombor kodi (ixtiyoriy)", type: "text", placeholder: "TSH-1" },
  ],
  events: [],
  async test({ config }) {
    const org = await get<{ rows: { name: string }[] }>(config, "/entity/organization?limit=1");
    return `Ulandi: ${org.rows[0]?.name ?? "МойСклад"}`;
  },
  async sync({ config }) {
    const rows = (await all<Row>(config, "/entity/product")).filter((p) => !p.archived && (p.article || p.code));
    const items = rows.map((p) => {
      const price = (config.price_type ? p.salePrices?.find((s) => s.priceType?.name === config.price_type) : p.salePrices?.[0])?.value ?? 0;
      return {
        sku: (p.article || p.code)!.trim(),
        name: p.name.trim(),
        category: p.pathName?.split("/").pop() || undefined,
        price: price / 100,
        cost: p.buyPrice ? p.buyPrice.value / 100 : undefined,
        weight_kg: p.weight || undefined,
      };
    });
    const r = await tx((db) => upsertBySku(db, items));
    let stock = "";
    if (config.warehouse_code) {
      const levels = await all<{ article?: string; code?: string; stock: number }>(config, "/report/stock/all");
      const s = await tx((db) =>
        setStockBySku(db, config.warehouse_code, levels.filter((l) => l.article || l.code).map((l) => ({ sku: (l.article || l.code)!.trim(), quantity: l.stock })), "MoySklad", "MoySklad qoldig'i"),
      );
      stock = `; qoldiq: ${s.changed} ta o'zgardi`;
    }
    return `Tovarlar: ${r.created} yangi, ${r.updated} yangilandi${stock}`;
  },
};
