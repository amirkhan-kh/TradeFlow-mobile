export const LANGS = ["uz", "uz-Cyrl", "ru", "en", "ky"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "ru";

export const LANG_NAMES: Record<Lang, string> = {
  uz: "O'zbekcha",
  "uz-Cyrl": "Ўзбекча",
  ru: "Русский",
  en: "English",
  ky: "Кыргызча",
};

/** BCP 47 tags for `Intl`. */
export const LOCALE_TAGS: Record<Lang, string> = {
  uz: "uz-Latn-UZ",
  "uz-Cyrl": "uz-Cyrl-UZ",
  ru: "ru-RU",
  en: "en-US",
  ky: "ky-KG",
};

export const isLang = (v: unknown): v is Lang => typeof v === "string" && (LANGS as readonly string[]).includes(v);

/** Manrope covers Cyrillic; Plus Jakarta Sans does not. */
export const isCyrillic = (lang: Lang) => lang === "ru" || lang === "ky" || lang === "uz-Cyrl";
