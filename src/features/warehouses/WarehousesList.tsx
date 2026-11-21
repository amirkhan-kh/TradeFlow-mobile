import { router } from "expo-router";
import { MapPin, Pencil, UserRound } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { api, errorText } from "@/shared/lib/api";
import { fmtCompact, fmtDate, fmtNum } from "@/shared/lib/format";
import { can } from "@/shared/lib/roles";
import { useMe } from "@/shared/lib/session";
import { clearApiCache } from "@/shared/lib/useApi";
import { usePaged } from "@/shared/lib/usePaged";
import { StatusBadge } from "@/shared/ui/Badge";
import { Button, IconButton } from "@/shared/ui/Button";
import { Card, Progress } from "@/shared/ui/Card";
import { SearchInput } from "@/shared/ui/Chips";
import { Field, Input, Toggle, toNum } from "@/shared/ui/Field";
import { Fab, ItemWrap, ListView } from "@/shared/ui/ListView";
import { Sheet } from "@/shared/ui/Sheet";
import { Alert } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";
import { colors } from "@/theme/tokens";

interface Warehouse {
  id: number;
  code: string;
  name: string;
  city: string;
  address: string | null;
  capacity: number;
  manager_name: string | null;
  active: boolean;
  units: number;
  stock_value: number;
  skus: number;
  last_audit_status: string | null;
  last_audit_at: string | null;
}

export function WarehousesList() {
  const t = useT();
  const me = useMe();
  const list = usePaged<Warehouse>("/warehouses");
  const [editing, setEditing] = useState<Partial<Warehouse> | null>(null);
  const edit = can(me.role, "catalog");

  return (
    <View className="flex-1">
      <ListView
        list={list}
        keyOf={(w) => w.id}
        emptyTitle={t("Ombor topilmadi")}
        header={
          <View className="px-4">
            <SearchInput value={list.q} onChange={list.setQ} placeholder={t("Nomi, shahar yoki kod…")} />
          </View>
        }
        renderItem={(w) => {
          const fill = w.capacity ? Math.min(100, (w.units / w.capacity) * 100) : 0;
          return (
            <ItemWrap>
              <Card className="overflow-hidden p-4">
                <View className="absolute inset-x-0 top-0 h-1 bg-brand-500" />
                <View className="flex-row items-start gap-3">
                  <View className="flex-1">
                    <View className="self-start rounded-md bg-ink-100 px-2 py-0.5">
                      <Txt weight="bold" className="text-[11px] text-ink-600">
                        {w.code}
                      </Txt>
                    </View>
                    <Txt weight="bold" className="mt-1.5 text-base">
                      {w.name}
                    </Txt>
                    <View className="mt-0.5 flex-row items-center gap-1">
                      <MapPin size={13} color={colors.ink[400]} />
                      <Txt className="flex-1 text-xs text-ink-500" numberOfLines={1}>
                        {w.city}
                        {w.address ? `, ${w.address}` : ""}
                      </Txt>
                    </View>
                  </View>
                  {edit && <IconButton icon={Pencil} label={t("Tahrirlash")} onPress={() => setEditing(w)} />}
                </View>
                <View className="mt-3 flex-row gap-2">
                  {[
                    [t("Qoldiq"), fmtNum(w.units)],
                    ["SKU", fmtNum(w.skus)],
                    [t("Qiymat"), fmtCompact(w.stock_value)],
                  ].map(([k, v]) => (
                    <View key={k} className="flex-1 items-center rounded-input bg-ink-50 py-2">
                      <Txt className="text-[11px] text-ink-500">{k}</Txt>
                      <Txt weight="bold" className="text-sm">
                        {v}
                      </Txt>
                    </View>
                  ))}
                </View>
                <View className="mt-3 flex-row justify-between">
                  <Txt className="text-xs text-ink-500">{t("Bandlik")}</Txt>
                  <Txt weight="semibold" className="text-xs text-ink-700">
                    {fill.toFixed(0)}%
                  </Txt>
                </View>
                <View className="mt-1">
                  <Progress pct={fill} tone={fill > 85 ? "amber" : "brand"} />
                </View>
                <View className="mt-3 flex-row items-center justify-between border-t border-ink-100 pt-3">
                  <View className="flex-row items-center gap-1.5">
                    <UserRound size={14} color={colors.ink[400]} />
                    <Txt className="text-xs text-ink-600">{w.manager_name ?? "—"}</Txt>
                  </View>
                  {w.last_audit_status ? (
                    <View className="flex-row items-center gap-2">
                      <Txt className="text-[11px] text-ink-400">{fmtDate(w.last_audit_at)}</Txt>
                      <StatusBadge status={w.last_audit_status} />
                    </View>
                  ) : (
                    <Txt weight="semibold" className="text-xs text-red-600">
                      {t("Audit o'tkazilmagan")}
                    </Txt>
                  )}
                </View>
                <Button variant="ghost" size="sm" className="mt-2" onPress={() => router.push(`/m/stock?warehouse_id=${w.id}`)}>
                  {t("Qoldiqlarni ko'rish →")}
                </Button>
              </Card>
            </ItemWrap>
          );
        }}
      />
      {edit && <Fab label={t("Ombor qo'shish")} onPress={() => setEditing({ active: true })} />}
      {editing && (
        <WarehouseSheet
          initial={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </View>
  );
}

function WarehouseSheet({ initial, onClose, onDone }: { initial: Partial<Warehouse>; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [f, setF] = useState({
    code: initial.code ?? "",
    name: initial.name ?? "",
    city: initial.city ?? "",
    capacity: String(initial.capacity ?? 0),
    address: initial.address ?? "",
    manager_name: initial.manager_name ?? "",
  });
  const [active, setActive] = useState(initial.active ?? true);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function submit() {
    setSaving(true);
    setError(undefined);
    try {
      await api(initial.id ? `/warehouses/${initial.id}` : "/warehouses", { method: initial.id ? "PUT" : "POST", json: { ...f, capacity: toNum(f.capacity) ?? 0, active } });
      clearApiCache();
      onDone();
    } catch (e) {
      setError(errorText(e));
      setSaving(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={initial.id ? t("Omborni tahrirlash") : t("Yangi ombor")}>
      <View className="flex-row gap-3">
        <Field label={t("Kod")} className="w-32">
          <Input value={f.code} onChangeText={set("code")} placeholder="TSH-03" autoCapitalize="characters" />
        </Field>
        <Field label={t("Nomi")} className="flex-1">
          <Input value={f.name} onChangeText={set("name")} />
        </Field>
      </View>
      <View className="flex-row gap-3">
        <Field label={t("Shahar")} className="flex-1">
          <Input value={f.city} onChangeText={set("city")} />
        </Field>
        <Field label={t("Sig'im (dona)")} className="flex-1">
          <Input value={f.capacity} onChangeText={set("capacity")} keyboardType="number-pad" />
        </Field>
      </View>
      <Field label={t("Manzil")}>
        <Input value={f.address} onChangeText={set("address")} />
      </Field>
      <Field label={t("Mas'ul shaxs")}>
        <Input value={f.manager_name} onChangeText={set("manager_name")} />
      </Field>
      <Toggle label={t("Faol")} value={active} onChange={setActive} />
      {error && <Alert>{error}</Alert>}
      <Button loading={saving} onPress={submit}>
        {t("Saqlash")}
      </Button>
    </Sheet>
  );
}
