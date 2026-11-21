import { DATASET_NAMES, datasetLabel } from "../feeds.js";
import { request } from "../net.js";
import type { Endpoint, OrderPayload, Provider } from "../types.js";

const feedEndpoints = (format: "json" | "csv", hint: (path: string) => string): Endpoint[] =>
  DATASET_NAMES.map((d) => {
    const path = `feed/${d}${format === "csv" ? "?format=csv" : ""}`;
    return { label: datasetLabel(d), method: "GET", path, hint: hint(path) };
  });

export const powerbi: Provider = {
  key: "powerbi",
  name: "Power BI",
  category: "bi",
  description:
    "Hisobot va dashboardlar uchun ma'lumot oqimi. Power BI Desktop → Get Data → Web → feed URL. Ixtiyoriy: streaming dataset'ga yangi buyurtmalarni real vaqtda yuborish.",
  vendors: "Power BI, Excel Power Query, Tableau, Looker Studio",
  docs: "https://learn.microsoft.com/power-bi/connect-data/desktop-connect-to-web",
  feeds: true,
  fields: [
    {
      key: "push_url",
      label: "Streaming dataset Push URL (ixtiyoriy)",
      type: "password",
      placeholder: "https://api.powerbi.com/beta/.../rows?key=...",
      help: "Ustunlar: date, number, client, region, warehouse, total, status",
    },
  ],
  events: ["order.created"],
  endpoints: feedEndpoints("json", () => "Power BI: Get Data → Web → URL. Sana filtri: &from=2026-01-01&to=2026-12-31"),
  async test({ config }) {
    if (!config.push_url) return "Feed URL'lar tayyor. Power BI'da Get Data → Web orqali ulang.";
    await request(config.push_url, { json: [] });
    return "Streaming dataset javob berdi";
  },
  async push({ config }, _event, data) {
    if (!config.push_url) return;
    const { order, client, warehouse } = data as OrderPayload;
    await request(config.push_url, {
      json: [{ date: order.created_at, number: order.number, client: client.name, region: client.region, warehouse: warehouse.name, total: order.total, status: order.status }],
    });
  },
};

export const googleSheets: Provider = {
  key: "google_sheets",
  name: "Google Sheets / Excel",
  category: "bi",
  description: "Jadvalga avtomatik yangilanadigan ma'lumot: Google Sheets'da =IMPORTDATA(\"URL\"), Excel'da Data → From Web (CSV).",
  vendors: "Google Sheets, Microsoft Excel, LibreOffice",
  feeds: true,
  fields: [],
  events: [],
  endpoints: feedEndpoints("csv", () => 'Google Sheets katagiga: =IMPORTDATA("<URL>")'),
  async test() {
    return "CSV URL'lar tayyor. Google Sheets'da =IMPORTDATA(\"URL\") bilan ulang.";
  },
};
