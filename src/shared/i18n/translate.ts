import { activeLang } from "./active";
import type { Lang } from "./config";
import { fill, type Vars } from "./fill";
import { messages, type MsgKey } from "./messages";
import type { Messages } from "./messages/types";
import { toCyrillic } from "./translit";

export type { Vars };
export type T = (key: MsgKey, vars?: Vars) => string;

const cyrCache = new WeakMap<Messages, Map<string, string>>();

function cyrillic(dict: Messages, key: string): string {
  let cache = cyrCache.get(dict);
  if (!cache) cyrCache.set(dict, (cache = new Map()));
  let s = cache.get(key);
  if (s === undefined) {
    s = dict[key]?.cy ?? toCyrillic(key);
    cache.set(key, s);
  }
  return s;
}

/** Unknown keys (e.g. text that came from the API) fall back to the source text. */
export function translateIn(dict: Messages, lang: Lang, key: string, vars?: Vars): string {
  return fill(lang === "uz" ? key : lang === "uz-Cyrl" ? cyrillic(dict, key) : (dict[key]?.[lang] ?? key), vars);
}

export const translate = (lang: Lang, key: string, vars?: Vars) => translateIn(messages, lang, key, vars);

export const tr: T = (key, vars) => translate(activeLang(), key, vars);

/** Text stored by the system (units, generated notes): known phrases are translated, user-typed text stays as it is. */
export const trData = (text: string | null | undefined) => (text ? translate(activeLang(), text) : "");
