import * as SecureStore from "expo-secure-store";
import { createContext, use, useCallback, useEffect, useMemo, useState } from "react";
import { clearApiCache } from "@/shared/lib/useApi";
import { setActiveLang } from "./active";
import { DEFAULT_LANG, isCyrillic, isLang, type Lang } from "./config";
import { translate, type T } from "./translate";

const KEY = "tf_lang";

interface Ctx {
  lang: Lang;
  setLang: (lang: Lang) => void;
}
const LangContext = createContext<Ctx>({ lang: DEFAULT_LANG, setLang: () => {} });

/** Renders nothing until the stored language is read, so the first frame is already in the right language. */
export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);

  useEffect(() => {
    SecureStore.getItemAsync(KEY)
      .catch(() => null)
      .then((v) => {
        const l = isLang(v) ? v : DEFAULT_LANG;
        setActiveLang(l);
        setLangState(l);
      });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setActiveLang(l);
    clearApiCache();
    setLangState(l);
    SecureStore.setItemAsync(KEY, l).catch(() => {});
  }, []);

  const value = useMemo(() => ({ lang: lang ?? DEFAULT_LANG, setLang }), [lang, setLang]);
  if (!lang) return null;
  return <LangContext value={value}>{children}</LangContext>;
}

export function useI18n(): { lang: Lang; t: T; setLang: (lang: Lang) => void; cyr: boolean } {
  const { lang, setLang } = use(LangContext);
  return useMemo(() => ({ lang, setLang, cyr: isCyrillic(lang), t: (key, vars) => translate(lang, key, vars) }), [lang, setLang]);
}

export const useT = (): T => useI18n().t;
