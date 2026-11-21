/** Key = the Uzbek (Latin) source text. `cy` overrides the automatic Cyrillic transliteration. */
export interface Entry {
  ru: string;
  en: string;
  ky: string;
  cy?: string;
}

export type Messages = Record<string, Entry>;
