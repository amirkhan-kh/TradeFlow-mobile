import { tx } from "../../../core/db.js";
import { upsertBySku } from "../../products/repository.js";
import { request } from "../net.js";
import type { Config, Provider } from "../types.js";

const API = "https://api-ru.iiko.services/api/1";

interface Nomenclature {
  groups: { id: string; name: string }[];
  productCategories: { id: string; name: string }[];
  products: {
    id: string;
    name: string;
    code: string | null;
    type: string;
    parentGroup: string | null;
    productCategoryId: string | null;
    measureUnit: string | null;
    weight: number | null;
    isDeleted: boolean;
    sizePrices: { price: { currentPrice: number } }[];
  }[];
}

async function auth(config: Config) {
  const { data } = await request<{ token: string }>(`${API}/access_token`, { json: { apiLogin: config.api_login } });
  const call = <T>(path: string, json: unknown) =>
    request<T>(`${API}${path}`, { json, headers: { authorization: `Bearer ${data.token}` }, timeoutMs: 60_000 }).then((r) => r.data);
  const orgs = await call<{ organizations: { id: string; name: string }[] }>("/organizations", { returnAdditionalInfo: false, includeDisabled: false });
  const org = config.organization_id ? orgs.organizations.find((o) => o.id === config.organization_id) : orgs.organizations[0];
  if (!org) throw new Error("iiko: tashkilot topilmadi — Organization ID ni tekshiring");
  return { call, org };
}

export const iiko: Provider = {
  key: "iiko",
  name: "iiko (iikoCloud)",
  category: "pos",
  description:
    "Restoran va kafelar uchun POS. Nomenklatura (tovar, SKU = artikul, narx, kategoriya) TradeFlow katalogiga import qilinadi — HoReCa mijozlarga yetkazishda bir xil kodlar.",
  vendors: "iikoCloud API (iikoFront, iikoOffice)",
  docs: "https://api-ru.iiko.services/",
  fields: [
    { key: "api_login", label: "API login", type: "password", required: true, help: "iikoWeb → Integratsiyalar → iikoCloud API" },
    { key: "organization_id", label: "Organization ID (ixtiyoriy)", type: "text", help: "Bo'sh bo'lsa birinchi tashkilot olinadi" },
  ],
  events: [],
  async test({ config }) {
    const { org } = await auth(config);
    return `Tashkilot: ${org.name}`;
  },
  async sync({ config }) {
    const { call, org } = await auth(config);
    const n = await call<Nomenclature>("/nomenclature", { organizationId: org.id });
    const names = new Map([...n.groups, ...n.productCategories].map((g) => [g.id, g.name]));
    const items = n.products
      .filter((p) => !p.isDeleted && p.code && (p.type === "Goods" || p.type === "Dish"))
      .map((p) => ({
        sku: p.code!.trim(),
        name: p.name.trim(),
        category: names.get(p.productCategoryId ?? "") ?? names.get(p.parentGroup ?? "") ?? undefined,
        unit: p.measureUnit ?? undefined,
        price: p.sizePrices[0]?.price.currentPrice ?? 0,
        weight_kg: p.weight ?? undefined,
      }));
    const r = await tx((db) => upsertBySku(db, items));
    return `${org.name}: ${r.created} ta yangi, ${r.updated} ta yangilandi`;
  },
};
