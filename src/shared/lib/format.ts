import type { Lang } from "@/shared/i18n/config";
import { activeLang } from "@/shared/i18n/active";

const num = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 });

const MONTHS: Record<Lang, string[]> = {
  uz: ["Yan", "Fev", "Mar", "Apr", "May", "Iyun", "Iyul", "Avg", "Sen", "Okt", "Noy", "Dek"],
  "uz-Cyrl": ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"],
  ru: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
  en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
  ky: ["янв", "фев", "мар", "апр", "май", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"],
};
const CURRENCY: Record<Lang, string> = { uz: "so'm", "uz-Cyrl": "сўм", ru: "сум", en: "UZS", ky: "сум" };
const COMPACT: Record<Lang, [string, string, string]> = {
  uz: ["mlrd", "mln", "ming"],
  "uz-Cyrl": ["млрд", "млн", "минг"],
  ru: ["млрд", "млн", "тыс."],
  en: ["B", "M", "K"],
  ky: ["млрд", "млн", "миң"],
};

const months = () => MONTHS[activeLang()];

export const currency = () => CURRENCY[activeLang()];
export const fmtNum = (n: number | string | null | undefined) => num.format(Number(n ?? 0));
export const fmtMoney = (n: number | string | null | undefined) => `${fmtNum(n)} ${currency()}`;

export function fmtCompact(n: number | string | null | undefined) {
  const v = Number(n ?? 0);
  const abs = Math.abs(v);
  const [bn, mn, k] = COMPACT[activeLang()];
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1)} ${bn}`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1)} ${mn}`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(0)} ${k}`;
  return fmtNum(v);
}

export const fmtCompactMoney = (n: number | string | null | undefined) => `${fmtCompact(n)} ${currency()}`;

export function fmtDate(d: string | Date | null | undefined, withTime = false) {
  if (!d) return "—";
  const date = new Date(d);
  const s = `${String(date.getDate()).padStart(2, "0")} ${months()[date.getMonth()]} ${date.getFullYear()}`;
  return withTime ? `${s}, ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}` : s;
}

export const monthLabel = (ym: string) => months()[Number(ym.slice(5, 7)) - 1];
export const dayLabel = (ymd: string) => `${Number(ymd.slice(8, 10))} ${months()[Number(ymd.slice(5, 7)) - 1]}`;

export function pctChange(curr: number, prev: number) {
  if (!prev) return null;
  return ((curr - prev) / prev) * 100;
}
