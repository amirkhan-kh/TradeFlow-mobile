import { basicAuth, request } from "../net.js";
import type { Config, Provider } from "../types.js";

async function send(config: Config, event: string, data: unknown) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (config.username) headers.authorization = basicAuth(config.username, config.password ?? "");
  await request(config.push_url, { method: "POST", headers, body: JSON.stringify({ event, data }) });
}

export const onec: Provider = {
  key: "onec",
  name: "1C:Enterprise",
  category: "erp",
  description:
    "Ikki tomonlama almashinuv. 1C tovarlar, narxlar va qoldiqlarni TradeFlow'ga yuboradi (POST); buyurtma, mijoz va to'lovlarni feed orqali oladi yoki 1C HTTP-servisiga real vaqtda qabul qiladi.",
  vendors: "1C:UT 11, 1C:KA 2, 1C:ERP, 1C:UNF, 1C:Buxgalteriya",
  feeds: true,
  fields: [
    { key: "push_url", label: "1C HTTP-servis URL (ixtiyoriy)", type: "url", placeholder: "https://1c.company.uz/base/hs/tradeflow/events" },
    { key: "username", label: "1C foydalanuvchi", type: "text" },
    { key: "password", label: "1C parol", type: "password" },
  ],
  events: ["order.created", "order.status_changed", "payment.created", "client.created"],
  endpoints: [
    { label: "Tovar va narxlarni yuklash", method: "POST", path: "1c/products", hint: '{"items":[{"sku":"A-1","name":"…","price":12000,"cost":9000,"category":"…","unit":"dona"}]}' },
    { label: "Ombor qoldig'ini yuklash", method: "POST", path: "1c/stock", hint: '{"warehouse_code":"TSH-1","items":[{"sku":"A-1","quantity":120}]}' },
    { label: "Buyurtmalar", method: "GET", path: "feed/orders", hint: "&from=YYYY-MM-DD&to=YYYY-MM-DD" },
    { label: "Buyurtma qatorlari", method: "GET", path: "feed/order_items" },
    { label: "Mijozlar", method: "GET", path: "feed/clients" },
    { label: "To'lovlar", method: "GET", path: "feed/payments" },
  ],
  async test({ config }) {
    if (!config.push_url) return "Kiruvchi almashinuv URL'lari tayyor (1C ulardan foydalanadi)";
    await send(config, "ping", {});
    return "1C HTTP-servis javob berdi";
  },
  async push({ config }, event, data) {
    if (config.push_url) await send(config, event, data);
  },
};
