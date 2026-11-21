import { amocrm } from "./providers/amocrm.js";
import { bitrix24 } from "./providers/bitrix24.js";
import { click } from "./providers/click.js";
import { didox } from "./providers/didox.js";
import { eskiz } from "./providers/eskiz.js";
import { googleSheets, powerbi } from "./providers/feeds.js";
import { iiko } from "./providers/iiko.js";
import { moysklad } from "./providers/moysklad.js";
import { onec } from "./providers/onec.js";
import { payme } from "./providers/payme.js";
import { sapB1 } from "./providers/sap.js";
import { spot2d } from "./providers/spot2d.js";
import { telegram } from "./providers/telegram.js";
import { telephony } from "./providers/telephony.js";
import { uzumMarket } from "./providers/uzum.js";
import { webhook } from "./providers/webhook.js";
import { phrase, type Lang } from "../../core/i18n.js";
import { CATALOG } from "./messages.js";
import type { Provider } from "./types.js";

export const PROVIDERS: Provider[] = [
  payme,
  click,
  didox,
  uzumMarket,
  onec,
  moysklad,
  sapB1,
  powerbi,
  googleSheets,
  bitrix24,
  amocrm,
  spot2d,
  iiko,
  telephony,
  telegram,
  eskiz,
  webhook,
];

const byKey = new Map(PROVIDERS.map((p) => [p.key, p]));
export const providerOf = (key: string) => byKey.get(key);

/** Catalog text in `lang`; text with no entry (URLs, JSON samples) is returned unchanged. A trailing "(file)" is kept as-is. */
export function localizer(lang: Lang) {
  const tx = (s: string): string => {
    if (CATALOG[s]) return phrase(CATALOG, lang, s);
    const m = /^(.+) (\([^()]+\))$/.exec(s);
    return m && CATALOG[m[1]] ? `${phrase(CATALOG, lang, m[1])} ${m[2]}` : s;
  };
  return <T extends string | undefined>(s: T): T => (s === undefined ? s : (tx(s) as T));
}

/** Public shape for the UI: no functions. */
export function describe(p: Provider, lang: Lang) {
  const tx = localizer(lang);
  return {
    key: p.key,
    name: tx(p.name),
    category: p.category,
    description: tx(p.description),
    vendors: p.vendors ?? null,
    docs: p.docs ?? null,
    fields: p.fields.map((f) => ({
      ...f,
      label: tx(f.label),
      placeholder: tx(f.placeholder),
      help: tx(f.help),
      options: f.options?.map((o) => ({ ...o, label: tx(o.label) })),
    })),
    events: p.events,
    endpoints: (p.endpoints ?? []).map((e) => ({ ...e, label: tx(e.label), hint: tx(e.hint) })),
    can_sync: Boolean(p.sync),
  };
}
