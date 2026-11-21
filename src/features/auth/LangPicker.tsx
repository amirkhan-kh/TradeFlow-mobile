import { Check, Globe } from "lucide-react-native";
import { useState } from "react";
import { Pressable } from "react-native";
import { LANG_NAMES, LANGS } from "@/shared/i18n/config";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { Sheet } from "@/shared/ui/Sheet";
import { Txt } from "@/shared/ui/Txt";
import { colors } from "@/theme/tokens";

/** Compact language button for screens without the profile (welcome, login). */
export function LangPicker({ light = false }: { light?: boolean }) {
  const { t, lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("Til")}
        onPress={() => setOpen(true)}
        className={`h-9 flex-row items-center gap-1.5 rounded-full border px-3 ${light ? "border-white/30 bg-white/10" : "border-ink-200 bg-white"}`}
        testID="lang-picker"
      >
        <Globe size={15} color={light ? "#ffffff" : colors.ink[700]} />
        <Txt weight="semibold" className={`text-xs ${light ? "text-white" : "text-ink-700"}`}>
          {LANG_NAMES[lang]}
        </Txt>
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("Til")}>
        {LANGS.map((l) => (
          <Pressable
            key={l}
            accessibilityRole="radio"
            accessibilityState={{ selected: l === lang }}
            onPress={() => {
              setLang(l);
              setOpen(false);
            }}
            className={`flex-row items-center justify-between rounded-input px-3 py-3 ${l === lang ? "bg-brand-50" : "active:bg-ink-50"}`}
            testID={`lang-${l}`}
          >
            <Txt weight={l === lang ? "bold" : "medium"} className="text-[15px]">
              {LANG_NAMES[l]}
            </Txt>
            {l === lang && <Check size={18} color={colors.brand[600]} />}
          </Pressable>
        ))}
      </Sheet>
    </>
  );
}
