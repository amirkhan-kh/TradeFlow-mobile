import type { Request } from "express";
import { MESSAGES, type Entry } from "./messages.js";
import { toCyrillic } from "./translit.js";

export const LANGS = ["uz", "uz-Cyrl", "ru", "en", "ky"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "ru";

/** Same cookie the web UI writes. */
export const LANG_COOKIE = "tf_lang";

const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);

/** `uz-Cyrl` has to be checked before plain `uz`. */
const ACCEPT: [RegExp, Lang][] = [
  [/^uz-cyrl/, "uz-Cyrl"],
  [/^uz/, "uz"],
  [/^ru/, "ru"],
  [/^en/, "en"],
  [/^ky/, "ky"],
];

/** Cookie (web UI) → `x-lang` header → `Accept-Language` (API clients) → `ru`. */
export function langOf(req: Request): Lang {
  const cookie = req.cookies?.[LANG_COOKIE];
  if (isLang(cookie)) return cookie;
  const header = req.headers["x-lang"];
  if (isLang(header)) return header;
  for (const part of (req.headers["accept-language"] ?? "").toLowerCase().split(",")) {
    const tag = part.split(";")[0].trim();
    const hit = ACCEPT.find(([re]) => re.test(tag));
    if (hit) return hit[1];
  }
  return DEFAULT_LANG;
}

type Vars = Record<string, string>;

/** Keys with `{name}` slots also match the already-filled Uzbek text, e.g. "Tovar #12 topilmadi…". */
const TEMPLATES = Object.keys(MESSAGES)
  .filter((k) => k.includes("{"))
  .map((key) => {
    const source = key.replace(/[.*+?^$()|[\]\\]/g, "\\$&").replace(/\\?\{(\w+)\\?\}/g, "(?<$1>.+?)");
    return { key, re: new RegExp(`^${source}$`, "s") };
  });

function lookup(text: string): { key: string; vars?: Vars } | undefined {
  if (MESSAGES[text]) return { key: text };
  for (const { key, re } of TEMPLATES) {
    const m = re.exec(text);
    if (m) return { key, vars: m.groups };
  }
  return undefined;
}

const fill = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (m, k: string) => vars[k] ?? m) : s);

/**
 * Builds text the API generates (not errors): the template is translated first, then `vars` are filled in unchanged,
 * so names and numbers inside never get transliterated.
 */
export function phrase(dict: Record<string, Entry>, lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const template = lang === "uz" ? key : lang === "uz-Cyrl" ? (dict[key]?.cy ?? toCyrillic(key)) : (dict[key]?.[lang] ?? key);
  return vars ? template.replace(/\{(\w+)\}/g, (m, k: string) => (vars[k] !== undefined ? String(vars[k]) : m)) : template;
}

/** Translates Uzbek (Latin) source text. Unknown text is returned as-is (transliterated for `uz-Cyrl`). */
export function translate(lang: Lang, text: string): string {
  if (lang === "uz") return text;
  const hit = lookup(text);
  if (lang === "uz-Cyrl") return hit ? fill(MESSAGES[hit.key].cy ?? toCyrillic(hit.key), hit.vars) : toCyrillic(text);
  if (!hit) return text;
  return fill(MESSAGES[hit.key][lang], hit.vars);
}

/** Like `translate`, but text with no dictionary entry (e.g. a remote system's error) stays exactly as received. */
export const translateKnown = (lang: Lang, text: string) => (lookup(text) ? translate(lang, text) : text);
