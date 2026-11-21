import { request, trimSlash } from "../net.js";
import type { ClientPayload, Config, Ctx, OrderPayload, PaymentPayload, Provider } from "../types.js";

/** SAP Business One Service Layer: login → calls with B1SESSION cookie → logout. */
async function session<T>(config: Config, fn: (call: <R>(path: string, json?: unknown, method?: string) => Promise<R>) => Promise<T>) {
  const url = trimSlash(config.service_layer_url);
  const login = await request(`${url}/Login`, { json: { CompanyDB: config.company_db, UserName: config.username, Password: config.password } });
  const cookie = login.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const call = async <R>(path: string, json?: unknown, method?: string) =>
    (await request<R>(`${url}${path}`, { json, method, headers: { cookie } })).data;
  try {
    return await fn(call);
  } finally {
    await request(`${url}/Logout`, { method: "POST", headers: { cookie } }).catch(() => undefined);
  }
}

type Call = <R>(path: string, json?: unknown, method?: string) => Promise<R>;

async function partner(ctx: Ctx, call: Call, c: { id: number; name: string; phone: string | null; address?: string | null }) {
  const known = await ctx.link.get("client", c.id);
  if (known) return known;
  const code = `${ctx.config.card_prefix || "TF"}${c.id}`;
  try {
    await call(`/BusinessPartners('${code}')`, undefined, "GET");
  } catch {
    await call("/BusinessPartners", { CardCode: code, CardName: c.name, CardType: "cCustomer", Phone1: c.phone ?? undefined, Address: c.address ?? undefined });
  }
  await ctx.link.set("client", c.id, code);
  return code;
}

export const sapB1: Provider = {
  key: "sap_b1",
  name: "SAP Business One",
  category: "erp",
  description:
    "Service Layer orqali: mijozlar → Business Partners, buyurtmalar → Sales Orders (ItemCode = SKU), to'lovlar → Incoming Payments.",
  vendors: "SAP Business One 9.3+ (HANA / MS SQL)",
  docs: "https://help.sap.com/docs/SAP_BUSINESS_ONE_SERVICE_LAYER",
  fields: [
    { key: "service_layer_url", label: "Service Layer URL", type: "url", required: true, placeholder: "https://sap.company.uz:50000/b1s/v1" },
    { key: "company_db", label: "Company DB", type: "text", required: true, placeholder: "SBODEMOUS" },
    { key: "username", label: "Foydalanuvchi", type: "text", required: true },
    { key: "password", label: "Parol", type: "password", required: true },
    { key: "card_prefix", label: "BP kod prefiksi", type: "text", placeholder: "TF", help: "Yangi mijoz kodi: <prefiks><TradeFlow ID>" },
    { key: "transfer_account", label: "O'tkazma/karta hisob raqami (GL)", type: "text", help: "Karta va o'tkazma to'lovlari uchun TransferAccount" },
  ],
  events: ["client.created", "order.created", "payment.created"],
  async test({ config }) {
    await session(config, async () => undefined);
    return `${config.company_db} bazasiga kirildi`;
  },
  async push(ctx, event, data) {
    await session(ctx.config, async (call) => {
      if (event === "client.created") await partner(ctx, call, (data as ClientPayload).client);
      if (event === "order.created") {
        const { order, client, items } = data as OrderPayload;
        const code = await partner(ctx, call, client);
        const doc = await call<{ DocEntry: number }>("/Orders", {
          CardCode: code,
          DocDueDate: order.created_at.slice(0, 10),
          NumAtCard: order.number,
          Comments: order.note ?? undefined,
          DiscountPercent: order.discount_pct,
          DocumentLines: items.map((i) => ({ ItemCode: i.sku, Quantity: i.quantity, UnitPrice: i.price })),
        });
        await ctx.link.set("order", order.id, String(doc.DocEntry));
      }
      if (event === "payment.created") {
        const { payment, client } = data as PaymentPayload;
        const code = await partner(ctx, call, { ...client, address: null });
        const cash = payment.method === "cash";
        if (!cash && !ctx.config.transfer_account) throw new Error("Karta/o'tkazma uchun 'transfer_account' sozlanmagan");
        await call("/IncomingPayments", {
          CardCode: code,
          DocDate: payment.created_at.slice(0, 10),
          Remarks: payment.note ?? `TradeFlow #${payment.id}`,
          ...(cash ? { CashSum: payment.amount } : { TransferSum: payment.amount, TransferAccount: ctx.config.transfer_account }),
        });
      }
    });
  },
};
