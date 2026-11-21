import { request } from "../net.js";
import type { Config, OrderPayload, PaymentPayload, Provider } from "../types.js";

const API = "https://notify.eskiz.uz/api";
const tokens = new Map<string, { token: string; until: number }>();

async function token(config: Config) {
  const hit = tokens.get(config.email);
  if (hit && hit.until > Date.now()) return hit.token;
  const { data } = await request<{ data: { token: string } }>(`${API}/auth/login`, {
    method: "POST",
    body: new URLSearchParams({ email: config.email, password: config.password }),
  });
  tokens.set(config.email, { token: data.data.token, until: Date.now() + 24 * 3600_000 });
  return data.data.token;
}

const money = (n: number) => `${Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ")} so'm`;

/** 998XXXXXXXXX or null for non-Uzbek / malformed numbers. */
export function uzPhone(raw: string | null | undefined) {
  const d = String(raw ?? "").replace(/\D/g, "");
  const full = d.length === 9 ? `998${d}` : d;
  return /^998\d{9}$/.test(full) ? full : null;
}

async function send(config: Config, phone: string, message: string) {
  await request(`${API}/message/sms/send`, {
    method: "POST",
    headers: { authorization: `Bearer ${await token(config)}` },
    body: new URLSearchParams({ mobile_phone: phone, message, from: config.from || "4546" }),
  });
}

export const eskiz: Provider = {
  key: "eskiz",
  name: "Eskiz SMS",
  category: "sms",
  description: "Mijozga SMS: buyurtma yuklanganda va yetkazilganda, to'lov qabul qilinganda (qolgan qarz bilan). Mijoz telefoni +998 formatida bo'lishi kerak.",
  vendors: "Eskiz.uz (notify.eskiz.uz)",
  docs: "https://documenter.getpostman.com/view/663428/RzfmES4z",
  fields: [
    { key: "email", label: "Eskiz email", type: "text", required: true },
    { key: "password", label: "Eskiz parol (secret key)", type: "password", required: true },
    { key: "from", label: "Jo'natuvchi nomi", type: "text", placeholder: "4546", help: "Test rejimda faqat Eskiz tasdiqlagan matnlar yuboriladi" },
    { key: "company", label: "SMS'dagi kompaniya nomi", type: "text", placeholder: "TradeFlow" },
  ],
  events: ["order.status_changed", "payment.created"],
  async test({ config }) {
    await token(config);
    return "Eskiz token olindi";
  },
  async push({ config }, event, data) {
    const brand = config.company || "TradeFlow";
    if (event === "order.status_changed") {
      const { order, client } = data as OrderPayload;
      const phone = uzPhone(client.phone);
      if (!phone) return;
      if (order.status === "shipped") await send(config, phone, `${brand}: ${order.number} buyurtmangiz yo'lga chiqdi. Summa: ${money(order.total)}.`);
      if (order.status === "delivered") await send(config, phone, `${brand}: ${order.number} buyurtmangiz yetkazildi. Rahmat!`);
    }
    if (event === "payment.created") {
      const { payment, client } = data as PaymentPayload;
      const phone = uzPhone(client.phone);
      if (phone) await send(config, phone, `${brand}: ${money(payment.amount)} to'lov qabul qilindi. Qolgan qarz: ${money(Math.max(0, client.balance))}.`);
    }
  },
};
