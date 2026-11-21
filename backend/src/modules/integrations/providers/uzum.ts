import { pool } from "../../../core/db.js";
import { availableBySku } from "../imports.js";
import { request } from "../net.js";
import type { Config, Provider } from "../types.js";

const API = "https://api-seller.uzum.uz/api/seller-openapi";

/** Seller token goes into Authorization as is — a "Bearer " prefix is rejected with 401. */
const call = <T>(config: Config, path: string, json?: unknown) =>
  request<T>(`${API}${path}`, { json, headers: { authorization: config.token.trim() } }).then((r) => r.data);

interface SkuAmount {
  skuId: number;
  skuTitle?: string;
  barcode?: string | number;
  amount: number;
  [k: string]: unknown;
}

export const uzumMarket: Provider = {
  key: "uzum_market",
  name: "Uzum Market",
  category: "marketplace",
  description:
    "FBS/DBS do'kon qoldig'ini TradeFlow ombori bilan tenglashtiradi: Uzum'dagi har bir SKU (shtrix-kod yoki SKU nomi = TradeFlow SKU) uchun bo'sh qoldiq yuboriladi.",
  vendors: "Uzum Market Seller OpenAPI",
  docs: "https://api-seller.uzum.uz/api/seller-openapi/swagger/swagger-ui/index.html",
  fields: [
    { key: "token", label: "Seller API token", type: "password", required: true, help: "seller.uzum.uz → Sozlamalar → API va integratsiyalar" },
    { key: "warehouse_code", label: "Qoldiq olinadigan ombor kodi", type: "text", placeholder: "Bo'sh — barcha omborlar" },
    {
      key: "match",
      label: "Moslash",
      type: "select",
      options: [
        { value: "barcode", label: "Shtrix-kod = TradeFlow SKU" },
        { value: "skuTitle", label: "SKU nomi = TradeFlow SKU" },
      ],
    },
  ],
  events: [],
  async test({ config }) {
    const shops = await call<{ name?: string; shopTitle?: string }[] | { payload?: { name?: string }[] }>(config, "/v1/shops");
    const list = Array.isArray(shops) ? shops : (shops.payload ?? []);
    return list.length ? `Do'konlar: ${list.map((s) => ("shopTitle" in s && s.shopTitle) || s.name).join(", ")}` : "Do'konlar topilmadi";
  },
  async sync({ config }) {
    const res = await call<{ payload?: { skuAmountList?: SkuAmount[] } }>(config, "/v2/fbs/sku/stocks");
    const list = res.payload?.skuAmountList ?? [];
    const free = await availableBySku(pool, config.warehouse_code);
    const key = (s: SkuAmount) => String((config.match === "skuTitle" ? s.skuTitle : s.barcode) ?? "").trim();
    const matched = list.filter((s) => free.has(key(s)));
    const changed = matched.filter((s) => s.amount !== free.get(key(s)));
    if (changed.length) await call(config, "/v2/fbs/sku/stocks", { skuAmountList: changed.map((s) => ({ ...s, amount: free.get(key(s)) })) });
    return `Uzum: ${changed.length} ta SKU yangilandi, ${matched.length - changed.length} ta o'zgarmadi, ${list.length - matched.length} ta mos kelmadi`;
  },
};
