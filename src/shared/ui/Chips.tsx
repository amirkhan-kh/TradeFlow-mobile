import { Search, X } from "lucide-react-native";
import { Pressable, ScrollView, TextInput, View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { colors } from "@/theme/tokens";
import { Txt, useFontFamily } from "./Txt";

export function Chips<V extends string>({ options, value, onChange }: { options: { value: V; label: string }[]; value: V; onChange: (v: V) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2 px-4" keyboardShouldPersistTaps="handled">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value || "all"}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            className={`h-9 justify-center rounded-full border px-4 ${on ? "border-brand-600 bg-brand-600" : "border-ink-200 bg-white active:bg-ink-50"}`}
          >
            <Txt weight="semibold" className={`text-[13px] ${on ? "text-white" : "text-ink-700"}`}>
              {o.label}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function SearchInput({ value, onChange, placeholder, autoFocus }: { value: string; onChange: (v: string) => void; placeholder?: string; autoFocus?: boolean }) {
  const t = useT();
  const fontFamily = useFontFamily();
  return (
    <View className="h-11 flex-row items-center gap-2 rounded-input border border-ink-200 bg-white px-3">
      <Search size={17} color={colors.ink[400]} />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? t("Qidirish…")}
        placeholderTextColor={colors.ink[400]}
        autoFocus={autoFocus}
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel={placeholder ?? t("Qidirish…")}
        className="h-11 flex-1 text-[15px] text-ink-900"
        style={{ fontFamily }}
      />
      {value ? (
        <Pressable hitSlop={8} accessibilityRole="button" accessibilityLabel={t("Tozalash")} onPress={() => onChange("")}>
          <X size={17} color={colors.ink[400]} />
        </Pressable>
      ) : null}
    </View>
  );
}
