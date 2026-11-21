import { createHmac } from "node:crypto";
import { request } from "../net.js";
import { EVENT_NAMES, type Config, type Provider } from "../types.js";

async function send(config: Config, event: string, data: unknown) {
  const body = JSON.stringify({ event, sent_at: new Date().toISOString(), data });
  const headers: Record<string, string> = { "content-type": "application/json", "x-tradeflow-event": event };
  if (config.secret) headers["x-tradeflow-signature"] = `sha256=${createHmac("sha256", config.secret).update(body).digest("hex")}`;
  await request(config.url, { method: "POST", headers, body });
}

export const webhook: Provider = {
  key: "webhook",
  name: "Webhook (Zapier, Make, n8n)",
  category: "automation",
  description:
    "Har bir hodisani JSON ko'rinishida istalgan URL'ga yuboradi. Zapier, Make, n8n, Google Apps Script yoki o'z serveringiz orqali 5000+ xizmatga ulash mumkin.",
  vendors: "Zapier, Make (Integromat), n8n, Albato, Apps Script",
  fields: [
    { key: "url", label: "Webhook URL", type: "url", required: true, placeholder: "https://hooks.zapier.com/hooks/catch/..." },
    {
      key: "secret",
      label: "Imzo kaliti (ixtiyoriy)",
      type: "password",
      help: "Berilsa, X-TradeFlow-Signature: sha256=HMAC(body) sarlavhasi qo'shiladi",
    },
  ],
  events: EVENT_NAMES,
  async test({ config }) {
    await send(config, "ping", { message: "TradeFlow ulanishi tekshirildi" });
    return "Webhook ping qabul qilindi";
  },
  async push({ config }, event, data) {
    await send(config, event, data);
  },
};
