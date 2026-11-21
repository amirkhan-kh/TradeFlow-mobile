import { ChevronDown } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { api, qs, type Page } from "@/shared/lib/api";
import { colors } from "@/theme/tokens";
import { Sheet } from "./Sheet";
import { SearchInput } from "./Chips";
import { Txt } from "./Txt";

/** Server-side search picker (`?q=` + limit 20) in a bottom sheet. */
export function SearchSelect<T extends { id: number }>({
  path,
  params = {},
  value,
  onChange,
  display,
  hint,
  title,
  placeholder,
  clearable = false,
}: {
  path: string;
  params?: Record<string, string>;
  value: T | null;
  onChange: (v: T | null) => void;
  display: (v: T) => string;
  hint?: (v: T) => string;
  title: string;
  placeholder?: string;
  clearable?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError(undefined);
      api<Page<T>>(`${path}${qs({ ...JSON.parse(paramsKey), q, limit: 20 })}`)
        .then((r) => alive && setItems(r.items))
        .catch((e: Error) => alive && setError(e.message))
        .finally(() => alive && setLoading(false));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [open, q, path, paramsKey]);

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={() => setOpen(true)} className="min-h-12 flex-row items-center rounded-input border border-ink-200 bg-white px-3.5 py-2 active:bg-ink-50">
        <View className="flex-1">
          <Txt className={`text-[15px] ${value ? "text-ink-900" : "text-ink-400"}`} numberOfLines={1}>
            {value ? display(value) : (placeholder ?? t("Qidiring va tanlang…"))}
          </Txt>
          {value && hint ? <Txt className="text-xs text-ink-500">{hint(value)}</Txt> : null}
        </View>
        <ChevronDown size={18} color={colors.ink[400]} />
      </Pressable>
      <Sheet open={open} onClose={() => setOpen(false)} title={title} scroll={false} tall>
        <View className="px-5 pb-2">
          <SearchInput value={q} onChange={setQ} autoFocus />
        </View>
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="px-5 pb-6"
          ListHeaderComponent={
            clearable && value ? (
              <Pressable
                onPress={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="border-b border-ink-100 py-3"
              >
                <Txt weight="semibold" className="text-[15px] text-ink-500">
                  {placeholder ?? "—"}
                </Txt>
              </Pressable>
            ) : undefined
          }
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator className="py-8" color={colors.brand[600]} />
            ) : (
              <Txt className="py-8 text-center text-sm text-ink-500">{error ?? t("Hech narsa topilmadi")}</Txt>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                onChange(item);
                setOpen(false);
              }}
              className={`border-b border-ink-100 py-3 ${value?.id === item.id ? "bg-brand-50" : "active:bg-ink-50"}`}
            >
              <Txt weight="semibold" className="text-[15px]">
                {display(item)}
              </Txt>
              {hint ? <Txt className="mt-0.5 text-xs text-ink-500">{hint(item)}</Txt> : null}
            </Pressable>
          )}
        />
      </Sheet>
    </>
  );
}

export interface WarehouseOption {
  id: number;
  name: string;
  code: string;
  city: string;
}

export function WarehouseSelect(props: { value: WarehouseOption | null; onChange: (v: WarehouseOption | null) => void; title: string; params?: Record<string, string>; placeholder?: string; clearable?: boolean }) {
  return <SearchSelect<WarehouseOption> path="/warehouses" display={(w) => w.name} hint={(w) => `${w.code} · ${w.city}`} {...props} />;
}
