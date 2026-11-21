import { request, trimSlash } from "../net.js";
import type { ClientPayload, Config, Ctx, LeadPayload, OrderPayload, PaymentPayload, Provider } from "../types.js";
import { plainText } from "./telegram.js";

async function call<T = unknown>(config: Config, method: string, params: object): Promise<T> {
  const { data } = await request<{ result: T; error?: string; error_description?: string }>(
    `${trimSlash(config.webhook_url)}/${method}.json`,
    { json: params },
  );
  if (data.error) throw new Error(`Bitrix24 ${method}: ${data.error_description ?? data.error}`);
  return data.result;
}

const phone = (p: string | null) => (p ? [{ VALUE: p, VALUE_TYPE: "WORK" }] : undefined);

async function company(ctx: Ctx, c: { id: number; name: string; phone: string | null; region: string; address: string | null }) {
  const known = await ctx.link.get("client", c.id);
  if (known) return known;
  const id = await call<number>(ctx.config, "crm.company.add", {
    fields: { TITLE: c.name, PHONE: phone(c.phone), ADDRESS: c.address ?? undefined, COMMENTS: `Hudud: ${c.region}`, ORIGINATOR_ID: "tradeflow", ORIGIN_ID: String(c.id) },
  });
  await ctx.link.set("client", c.id, String(id));
  return String(id);
}

const comment = (config: Config, type: "deal" | "company", id: string, text: string) =>
  call(config, "crm.timeline.comment.add", { fields: { ENTITY_ID: Number(id), ENTITY_TYPE: type, COMMENT: text } });

export const bitrix24: Provider = {
  key: "bitrix24",
  name: "Bitrix24",
  category: "crm",
  description:
    "Lidlar → CRM lidlari, mijozlar → kompaniyalar, buyurtmalar → bitimlar (tovar qatorlari bilan). Holat va to'lovlar bitim/kompaniya tarixiga izoh bo'lib tushadi.",
  docs: "https://apidocs.bitrix24.ru/local-integrations/local-webhooks.html",
  fields: [
    {
      key: "webhook_url",
      label: "Kiruvchi webhook URL",
      type: "password",
      required: true,
      placeholder: "https://company.bitrix24.kz/rest/1/abc123xyz/",
      help: "Bitrix24 → Dasturchilar → Kiruvchi webhook, ruxsat: crm",
    },
  ],
  events: ["lead.created", "client.created", "order.created", "order.status_changed", "payment.created"],
  async test({ config }) {
    await call(config, "crm.deal.fields", {});
    return "Bitrix24 CRM'ga ulanish bor";
  },
  async push(ctx, event, data) {
    const { config } = ctx;
    if (event === "lead.created") {
      const { lead } = data as LeadPayload;
      await call(config, "crm.lead.add", {
        fields: { TITLE: `TradeFlow: ${lead.company ?? lead.name}`, NAME: lead.name, COMPANY_TITLE: lead.company ?? undefined, PHONE: phone(lead.phone), COMMENTS: lead.message ?? undefined, SOURCE_ID: "WEB" },
      });
    }
    if (event === "client.created") await company(ctx, (data as ClientPayload).client);
    if (event === "order.created") {
      const { order, client, items } = data as OrderPayload;
      const companyId = await company(ctx, client);
      const dealId = await call<number>(config, "crm.deal.add", {
        fields: { TITLE: `Buyurtma ${order.number}`, OPPORTUNITY: order.total, CURRENCY_ID: "UZS", COMPANY_ID: Number(companyId), COMMENTS: order.note ?? undefined, ORIGINATOR_ID: "tradeflow", ORIGIN_ID: String(order.id) },
      });
      await call(config, "crm.deal.productrows.set", {
        id: dealId,
        rows: items.map((i) => ({ PRODUCT_NAME: `${i.name} (${i.sku})`, PRICE: i.price, QUANTITY: i.quantity })),
      });
      await ctx.link.set("order", order.id, String(dealId));
    }
    if (event === "order.status_changed") {
      const dealId = await ctx.link.get("order", (data as OrderPayload).order.id);
      if (dealId) await comment(config, "deal", dealId, plainText(event, data));
    }
    if (event === "payment.created") {
      const companyId = await ctx.link.get("client", (data as PaymentPayload).client.id);
      if (companyId) await comment(config, "company", companyId, plainText(event, data));
    }
  },
};
