import { pool } from "../../../core/db.js";
import { request } from "../net.js";
import type { Config, OrderPayload, Provider } from "../types.js";

const base = (config: Config) => (config.environment === "test" ? "https://stage.goodsign.biz" : "https://api-partners.didox.uz");

const tokens = new Map<string, { token: string; until: number }>();

async function token(config: Config) {
  const cacheKey = `${config.tin}:${config.environment ?? ""}`;
  const hit = tokens.get(cacheKey);
  if (hit && hit.until > Date.now()) return hit.token;
  const { data } = await request<{ token: string }>(`${base(config)}/v1/auth/${config.tin}/password/ru`, {
    json: { password: config.password },
    headers: { "Partner-Authorization": config.partner_token },
  });
  tokens.set(cacheKey, { token: data.token, until: Date.now() + 5 * 3600_000 });
  return data.token;
}

const call = async <T>(config: Config, path: string, json?: unknown) =>
  (await request<T>(`${base(config)}${path}`, { json, headers: { "Partner-Authorization": config.partner_token, "user-key": await token(config) } })).data;

export interface CompanyInfo {
  tin: string;
  name: string | null;
  address: string | null;
  director: string | null;
  account: string | null;
  bank_id: string | null;
  vat_reg_code: string | null;
}

/** Taxpayer card from the State Tax Committee registry via Didox. */
export async function companyByTin(config: Config, tin: string): Promise<CompanyInfo> {
  const d = await call<Record<string, unknown>>(config, `/v1/utils/info/${tin}`);
  const s = (k: string[]) => (k.map((x) => d[x]).find((v) => typeof v === "string" && v) as string | undefined) ?? null;
  return {
    tin,
    name: s(["name", "shortName", "fullName"]),
    address: s(["address"]),
    director: s(["director", "directorName"]),
    account: s(["account"]),
    bank_id: s(["bankCode", "mfo", "bankId"]),
    vat_reg_code: s(["vatRegCode", "vatCode"]),
  };
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const didox: Provider = {
  key: "didox",
  name: "Didox — E-faktura (Soliq)",
  category: "einvoice",
  description:
    "Buyurtma yuklanganda (shipped) Soliq formatidagi elektron hisob-faktura (ЭСФ, 002) Didox'da qoralama sifatida yaratiladi — E-IMZO bilan imzolab yuborasiz. Mijoz INN bo'yicha rekvizitlarni soliq bazasidan to'ldiradi.",
  vendors: "Didox (Soliq qo'mitasi akkreditatsiyalangan EDO operatori)",
  docs: "https://api-docs.didox.uz/ru/home",
  fields: [
    { key: "partner_token", label: "Partner token", type: "password", required: true, help: "Didox hamkorlik shartnomasi bo'yicha beriladi" },
    { key: "tin", label: "Korxona INN (STIR)", type: "text", required: true, placeholder: "123456789" },
    { key: "password", label: "Didox paroli", type: "password", required: true, help: "didox.uz → Profil → Akkaunt (ЭЦП bilan kirish parol yaratmaydi)" },
    { key: "seller_name", label: "Korxona nomi", type: "text", required: true },
    { key: "vat_reg_code", label: "QQS to'lovchi kodi", type: "text" },
    { key: "account", label: "Hisob raqami", type: "text", placeholder: "20208000…" },
    { key: "bank_id", label: "Bank MFO", type: "text", placeholder: "00014" },
    { key: "address", label: "Manzil", type: "text" },
    {
      key: "vat_payer",
      label: "QQS to'lovchisi",
      type: "select",
      options: [
        { value: "yes", label: "Ha — narxlar QQS bilan" },
        { value: "no", label: "Yo'q (QQSsiz)" },
      ],
    },
    {
      key: "environment",
      label: "Muhit",
      type: "select",
      options: [
        { value: "production", label: "Ishchi (api-partners.didox.uz)" },
        { value: "test", label: "Test (stage.goodsign.biz)" },
      ],
    },
  ],
  events: ["order.status_changed"],
  async test({ config }) {
    const me = await companyByTin(config, config.tin);
    return `Didox'ga kirildi: ${me.name ?? config.tin}`;
  },
  async push(ctx, _event, data) {
    const { order, client } = data as OrderPayload;
    if (order.status !== "shipped" || (await ctx.link.get("order", order.id))) return;
    const { config } = ctx;
    const buyer = await pool.query<{ inn: string | null; name: string; address: string | null }>(`SELECT inn, name, address FROM clients WHERE id = $1`, [client.id]);
    const inn = buyer.rows[0]?.inn;
    if (!inn) throw new Error(`${client.name}: mijoz INN kiritilmagan — mijoz kartochkasini to'ldiring`);
    const { rows: lines } = await pool.query<{ name: string; sku: string; ikpu: string | null; package_code: string | null; unit: string; vat_rate: number; quantity: number; price: number }>(
      `SELECT p.name, p.sku, p.ikpu, p.package_code, p.unit, p.vat_rate, i.quantity, i.price
       FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = $1 ORDER BY i.id`,
      [order.id],
    );
    const missing = lines.filter((l) => !l.ikpu || !l.package_code).map((l) => l.sku);
    if (missing.length) throw new Error(`IKPU yoki o'ram kodi yo'q: ${missing.join(", ")} — tovar kartochkasini to'ldiring`);

    const hasVat = config.vat_payer !== "no";
    const discount = 1 - order.discount_pct / 100;
    const products = lines.map((l, i) => {
      const gross = round2(l.quantity * l.price * discount);
      const rate = hasVat ? Number(l.vat_rate) : 0;
      const deliverySum = round2(gross / (1 + rate / 100));
      return {
        OrdNo: i + 1,
        Name: l.name,
        CatalogCode: l.ikpu,
        PackageCode: l.package_code,
        PackageName: l.unit,
        Count: l.quantity,
        Summa: round2(deliverySum / l.quantity),
        DeliverySum: deliverySum,
        VatRate: rate,
        VatSum: round2(gross - deliverySum),
        DeliverySumWithVat: gross,
        WithoutVat: !hasVat,
        Origin: 2,
      };
    });
    const party = (name: string, extra: Partial<Record<string, string | null | undefined>> = {}) =>
      Object.fromEntries(Object.entries({ Name: name, ...extra }).filter(([, v]) => v));
    const doc = await call<Record<string, unknown>>(config, "/v1/documents/002/create", {
      Version: 1,
      FacturaType: 0,
      FacturaDoc: { FacturaNo: order.number, FacturaDate: new Date().toISOString().slice(0, 10) },
      ContractDoc: { ContractNo: order.number, ContractDate: order.created_at.slice(0, 10) },
      SellerTin: config.tin,
      Seller: party(config.seller_name, { VatRegCode: config.vat_reg_code, Account: config.account, BankId: config.bank_id, Address: config.address }),
      BuyerTin: inn,
      Buyer: party(buyer.rows[0].name, { Address: buyer.rows[0].address }),
      ProductList: { Tin: config.tin, HasVat: hasVat, HasExcise: false, HasLgota: false, HasCommittent: false, Products: products },
    });
    const id = doc._id ?? doc.id ?? doc.doc_id ?? doc.document_id;
    await ctx.link.set("order", order.id, String(id ?? order.number));
  },
};
