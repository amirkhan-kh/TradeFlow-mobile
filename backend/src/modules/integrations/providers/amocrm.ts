import { request } from "../net.js";
import type { ClientPayload, Config, Ctx, LeadPayload, OrderPayload, PaymentPayload, Provider } from "../types.js";
import { plainText } from "./telegram.js";

function base(config: Config) {
  const d = config.subdomain.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  return `https://${d.includes(".") ? d : `${d}.amocrm.ru`}/api/v4`;
}

const api = <T>(config: Config, path: string, json?: unknown) =>
  request<T>(`${base(config)}${path}`, { json, headers: { authorization: `Bearer ${config.access_token}` } }).then((r) => r.data);

const phoneField = (p: string | null) => (p ? [{ field_code: "PHONE", values: [{ value: p, enum_code: "WORK" }] }] : undefined);

async function company(ctx: Ctx, c: { id: number; name: string; phone: string | null }) {
  const known = await ctx.link.get("client", c.id);
  if (known) return known;
  const res = await api<{ _embedded: { companies: { id: number }[] } }>(ctx.config, "/companies", [
    { name: c.name, custom_fields_values: phoneField(c.phone) },
  ]);
  const id = String(res._embedded.companies[0].id);
  await ctx.link.set("client", c.id, id);
  return id;
}

const note = (config: Config, entity: "leads" | "companies", id: string, text: string) =>
  api(config, `/${entity}/${id}/notes`, [{ note_type: "common", params: { text } }]);

export const amocrm: Provider = {
  key: "amocrm",
  name: "amoCRM / Kommo",
  category: "crm",
  description:
    "Sayt lidlari va buyurtmalar amoCRM'da sdelka bo'lib ochiladi (summa bilan), mijozlar kompaniya sifatida. Holat va to'lovlar sdelka/kompaniya izohiga yoziladi.",
  docs: "https://www.amocrm.ru/developers/content/oauth/step-by-step#long_lived_token",
  fields: [
    { key: "subdomain", label: "Akkaunt manzili", type: "text", required: true, placeholder: "mycompany yoki mycompany.kommo.com" },
    {
      key: "access_token",
      label: "Uzoq muddatli token",
      type: "password",
      required: true,
      help: "amoCRM → amoMarket → Integratsiya yaratish → Kalitlar → Uzoq muddatli token",
    },
  ],
  events: ["lead.created", "client.created", "order.created", "order.status_changed", "payment.created"],
  async test({ config }) {
    const acc = await api<{ name: string }>(config, "/account");
    return `Akkaunt: ${acc.name}`;
  },
  async push(ctx, event, data) {
    const { config } = ctx;
    if (event === "lead.created") {
      const { lead } = data as LeadPayload;
      await api(config, "/leads/complex", [
        {
          name: `Sayt: ${lead.company ?? lead.name}`,
          _embedded: {
            contacts: [{ first_name: lead.name, custom_fields_values: phoneField(lead.phone) }],
            ...(lead.company ? { companies: [{ name: lead.company }] } : {}),
          },
        },
      ]);
    }
    if (event === "client.created") await company(ctx, (data as ClientPayload).client);
    if (event === "order.created") {
      const { order, client, items } = data as OrderPayload;
      const companyId = await company(ctx, client);
      const [created] = await api<{ id: number }[]>(config, "/leads/complex", [
        { name: `Buyurtma ${order.number}`, price: Math.round(order.total), _embedded: { companies: [{ id: Number(companyId) }] } },
      ]);
      await ctx.link.set("order", order.id, String(created.id));
      await note(config, "leads", String(created.id), items.map((i) => `${i.name} (${i.sku}) × ${i.quantity} = ${i.price * i.quantity}`).join("\n"));
    }
    if (event === "order.status_changed") {
      const leadId = await ctx.link.get("order", (data as OrderPayload).order.id);
      if (leadId) await note(config, "leads", leadId, plainText(event, data));
    }
    if (event === "payment.created") {
      const companyId = await ctx.link.get("client", (data as PaymentPayload).client.id);
      if (companyId) await note(config, "companies", companyId, plainText(event, data));
    }
  },
};
