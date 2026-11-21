import { request } from "../net.js";
import { EVENTS, type Config, type EventName, type Payload, type Provider } from "../types.js";
import type { ClientPayload, LeadPayload, OrderPayload, PaymentPayload, StockPayload } from "../types.js";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
const money = (n: number) => `${Math.round(n).toLocaleString("ru-RU").replace(/,/g, " ")} so'm`;
const METHOD: Record<string, string> = { cash: "naqd", card: "karta", transfer: "o'tkazma", payme: "Payme", click: "Click" };

export function format(event: EventName, data: Payload): string {
  const title = `<b>${esc(EVENTS[event])}</b>`;
  switch (event) {
    case "order.created": {
      const { order, client, items } = data as OrderPayload;
      const lines = items.slice(0, 10).map((i) => `• ${esc(i.name)} × ${i.quantity}`).join("\n");
      return `${title}\n${esc(order.number)} — ${esc(client.name)} (${esc(client.region)})\nSumma: <b>${money(order.total)}</b>\n${lines}`;
    }
    case "order.status_changed": {
      const { order, client } = data as OrderPayload;
      return `${title}\n${esc(order.number)} — ${esc(client.name)}\n${esc(order.previous_status ?? "")} → <b>${esc(order.status)}</b>`;
    }
    case "payment.created": {
      const { payment, client } = data as PaymentPayload;
      return `${title}\n${esc(client.name)}: <b>${money(payment.amount)}</b> (${METHOD[payment.method]})\nQoldiq qarz: ${money(client.balance)}`;
    }
    case "client.created": {
      const { client } = data as ClientPayload;
      return `${title}\n${esc(client.name)} — ${esc(client.region)}${client.phone ? `\n${esc(client.phone)}` : ""}`;
    }
    case "lead.created": {
      const { lead } = data as LeadPayload;
      return `${title}\n${esc(lead.name)}${lead.company ? ` (${esc(lead.company)})` : ""}\n${esc(lead.phone)}${lead.message ? `\n${esc(lead.message)}` : ""}`;
    }
    case "stock.moved": {
      const { movement, product, warehouse, to_warehouse } = data as StockPayload;
      const where = to_warehouse ? `${esc(warehouse.name)} → ${esc(to_warehouse.name)}` : esc(warehouse.name);
      return `${title}\n${esc(product.name)} (${esc(product.sku)}): ${movement.quantity}\n${where}`;
    }
  }
}

/** Same message without HTML, for CRM timeline comments and notes. */
export const plainText = (event: EventName, data: Payload) =>
  format(event, data)
    .replace(/<[^>]+>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

const send = (config: Config, text: string) =>
  request(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
    json: { chat_id: config.chat_id, text, parse_mode: "HTML", disable_web_page_preview: true },
  });

export const telegram: Provider = {
  key: "telegram",
  name: "Telegram",
  category: "messenger",
  description: "Buyurtma, to'lov, lid va ombor hodisalarini Telegram guruh yoki kanalga xabar qilib yuboradi.",
  docs: "https://core.telegram.org/bots#how-do-i-create-a-bot",
  fields: [
    { key: "bot_token", label: "Bot token", type: "password", required: true, placeholder: "123456:ABC-DEF…", help: "@BotFather'dan oling" },
    { key: "chat_id", label: "Chat ID", type: "text", required: true, placeholder: "-1001234567890", help: "Botni guruhga qo'shing; ID uchun @getidsbot" },
  ],
  events: ["order.created", "order.status_changed", "payment.created", "client.created", "lead.created", "stock.moved"],
  async test({ config }) {
    const { data } = await request<{ result: { username: string } }>(`https://api.telegram.org/bot${config.bot_token}/getMe`);
    await send(config, "<b>TradeFlow</b> ulandi. Hodisalar shu chatga keladi.");
    return `@${data.result.username} xabar yubordi`;
  },
  async push({ config }, event, data) {
    await send(config, format(event, data));
  },
};
