import { DEFAULT_LANG, type Lang } from "./config";

let active: Lang = DEFAULT_LANG;

/** Set by `I18nProvider`, read by code outside React (`api`, `format`). */
export const setActiveLang = (lang: Lang) => {
  active = lang;
};
export const activeLang = () => active;
