import { Check, ChevronDown, Eye, EyeOff } from "lucide-react-native";
import { useState, type ComponentRef } from "react";
import { Pressable, Switch, TextInput, View, type TextInputProps } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { colors } from "@/theme/tokens";
import { Sheet } from "./Sheet";
import { Txt, useFontFamily } from "./Txt";

export function Field({ label, hint, error, children, className = "" }: { label: string; hint?: string; error?: string; children: React.ReactNode; className?: string }) {
  return (
    <View className={className}>
      <Txt weight="semibold" className="mb-1.5 text-[13px] text-ink-700">
        {label}
      </Txt>
      {children}
      {error ? <Txt className="mt-1 text-xs text-red-600">{error}</Txt> : hint ? <Txt className="mt-1 text-xs text-ink-500">{hint}</Txt> : null}
    </View>
  );
}

export function Input({ className = "", style, multiline, ...rest }: TextInputProps & { className?: string; ref?: React.Ref<ComponentRef<typeof TextInput>> }) {
  const fontFamily = useFontFamily();
  return (
    <TextInput
      placeholderTextColor={colors.ink[400]}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
      className={`rounded-input border border-ink-200 bg-white px-3.5 text-[15px] text-ink-900 focus:border-brand-500 ${multiline ? "min-h-24 py-3" : "h-12"} ${className}`}
      style={[{ fontFamily }, style]}
      {...rest}
    />
  );
}

export function PasswordInput(props: TextInputProps & { ref?: React.Ref<ComponentRef<typeof TextInput>> }) {
  const t = useT();
  const [show, setShow] = useState(false);
  return (
    <View className="justify-center">
      <Input {...props} secureTextEntry={!show} autoCapitalize="none" autoCorrect={false} className="pr-12" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={show ? t("Parolni yashirish") : t("Parolni ko'rsatish")}
        hitSlop={8}
        onPress={() => setShow((s) => !s)}
        className="absolute right-3 size-8 items-center justify-center"
      >
        {show ? <EyeOff size={18} color={colors.ink[500]} /> : <Eye size={18} color={colors.ink[500]} />}
      </Pressable>
    </View>
  );
}

export interface Option<V extends string = string> {
  value: V;
  label: string;
  hint?: string;
}

export function Select<V extends string>({ value, options, onChange, title, placeholder }: { value: V; options: Option<V>[]; onChange: (v: V) => void; title: string; placeholder?: string }) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={() => setOpen(true)} className="h-12 flex-row items-center rounded-input border border-ink-200 bg-white px-3.5 active:bg-ink-50">
        <Txt className={`flex-1 text-[15px] ${current ? "text-ink-900" : "text-ink-400"}`} numberOfLines={1}>
          {current?.label ?? placeholder ?? "—"}
        </Txt>
        <ChevronDown size={18} color={colors.ink[400]} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={title}>
        <View className="gap-1">
          {options.map((o) => (
            <Pressable
              key={o.value}
              accessibilityRole="radio"
              accessibilityState={{ selected: o.value === value }}
              onPress={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex-row items-center gap-3 rounded-input px-3 py-3 ${o.value === value ? "bg-brand-50" : "active:bg-ink-50"}`}
            >
              <View className="flex-1">
                <Txt weight={o.value === value ? "bold" : "medium"} className="text-[15px]">
                  {o.label}
                </Txt>
                {o.hint ? <Txt className="text-xs text-ink-500">{o.hint}</Txt> : null}
              </View>
              {o.value === value ? <Check size={18} color={colors.brand[600]} /> : null}
            </Pressable>
          ))}
        </View>
      </Sheet>
    </>
  );
}

export function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable accessibilityRole="switch" accessibilityState={{ checked: value }} onPress={() => onChange(!value)} className="flex-row items-center justify-between py-1">
      <Txt weight="medium" className="text-sm text-ink-700">
        {label}
      </Txt>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.brand[500], false: colors.ink[200] }} thumbColor="#ffffff" />
    </Pressable>
  );
}

/** Numeric text field state: keeps the raw string, exposes the parsed number. */
export const toNum = (s: string) => (s.trim() === "" ? undefined : Number(s.replace(/\s/g, "").replace(",", ".")));
