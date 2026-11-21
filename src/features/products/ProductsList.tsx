import { useState } from "react";
import { View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { trData } from "@/shared/i18n/translate";
import { api, errorText } from "@/shared/lib/api";
import { fmtDate, fmtMoney, fmtNum } from "@/shared/lib/format";
import { can } from "@/shared/lib/roles";
import { useMe } from "@/shared/lib/session";
import { clearApiCache, useApi } from "@/shared/lib/useApi";
import { usePaged } from "@/shared/lib/usePaged";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Chips, SearchInput } from "@/shared/ui/Chips";
import { Field, Input, Toggle, toNum } from "@/shared/ui/Field";
import { Fab, ItemWrap, ListView } from "@/shared/ui/ListView";
import { Sheet } from "@/shared/ui/Sheet";
import { Alert } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";

interface Product {
  id: number;
  sku: string;
  name: string;
  category: string;
  unit: string;
  weight_kg: number;
  price: number;
  cost: number;
  min_stock: number;
  expires_at: string | null;
  active: boolean;
  ikpu: string | null;
  package_code: string | null;
  vat_rate: number;
  stock: number;
  reserved: number;
}

const soon = (d: string | null) => d !== null && new Date(d).getTime() - Date.now() < 45 * 86_400_000;

export function ProductsList() {
  const t = useT();
  const me = useMe();
  const list = usePaged<Product>("/products");
  const cats = useApi<{ items: string[] }>("/products/categories");
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const edit = can(me.role, "catalog");

  return (
    <View className="flex-1">
      <ListView
        list={list}
        keyOf={(p) => p.id}
        emptyTitle={t("Tovar topilmadi")}
        header={
          <View className="gap-3">
            <View className="px-4">
              <SearchInput value={list.q} onChange={list.setQ} placeholder={t("Nomi yoki SKU…")} />
            </View>
            <Chips options={[{ value: "", label: t("Barchasi") }, ...(cats.data?.items.map((c) => ({ value: c, label: trData(c) })) ?? [])]} value={list.status} onChange={list.setStatus} />
          </View>
        }
        renderItem={(p) => {
          const margin = p.price ? ((p.price - p.cost) / p.price) * 100 : 0;
          const low = p.stock - p.reserved <= p.min_stock;
          return (
            <ItemWrap>
              <Card className="p-4" onPress={edit ? () => setEditing(p) : undefined}>
                <View className="flex-row items-start gap-3">
                  <View className="flex-1">
                    <Txt weight="bold" className="text-[15px]" numberOfLines={2}>
                      {p.name}
                    </Txt>
                    <Txt className="text-xs text-ink-500">{p.sku}</Txt>
                  </View>
                  <Badge tone={p.active ? "gray" : "red"}>{trData(p.category)}</Badge>
                </View>
                <View className="mt-3 flex-row items-end justify-between">
                  <View>
                    <Txt weight="extrabold" className="text-base">
                      {fmtMoney(p.price)}
                    </Txt>
                    <Txt className="text-[11px] text-ink-500">
                      {t("Tannarx")}: {fmtMoney(p.cost)} · <Txt weight="bold" className="text-[11px] text-brand-600">{margin.toFixed(0)}%</Txt>
                    </Txt>
                  </View>
                  <View className="items-end">
                    <Txt weight="bold" className={`text-sm ${low ? "text-red-600" : "text-ink-900"}`}>
                      {fmtNum(p.stock)} {trData(p.unit)}
                    </Txt>
                    <Txt className="text-[11px] text-ink-500">
                      {t("Band")}: {fmtNum(p.reserved)}
                    </Txt>
                  </View>
                </View>
                {p.expires_at ? (
                  <Txt className={`mt-2 text-[11px] ${soon(p.expires_at) ? "text-amber-700" : "text-ink-500"}`}>
                    {t("Yaroqlilik")}: {fmtDate(p.expires_at)}
                  </Txt>
                ) : null}
              </Card>
            </ItemWrap>
          );
        }}
      />
      {edit && <Fab label={t("Tovar qo'shish")} onPress={() => setEditing({ unit: "dona", active: true })} />}
      {editing && (
        <ProductSheet
          initial={editing}
          onClose={() => setEditing(null)}
          onDone={() => {
            setEditing(null);
            list.reload();
            cats.reload();
          }}
        />
      )}
    </View>
  );
}

function ProductSheet({ initial, onClose, onDone }: { initial: Partial<Product>; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
  const [f, setF] = useState({
    name: s(initial.name),
    sku: s(initial.sku),
    category: s(initial.category),
    unit: s(initial.unit),
    weight_kg: s(initial.weight_kg ?? 0),
    price: s(initial.price),
    cost: s(initial.cost ?? 0),
    min_stock: s(initial.min_stock ?? 0),
    expires_at: initial.expires_at?.slice(0, 10) ?? "",
    ikpu: s(initial.ikpu),
    package_code: s(initial.package_code),
    vat_rate: s(initial.vat_rate ?? 12),
  });
  const [active, setActive] = useState(initial.active ?? true);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function submit() {
    setSaving(true);
    setError(undefined);
    try {
      await api(initial.id ? `/products/${initial.id}` : "/products", {
        method: initial.id ? "PUT" : "POST",
        json: {
          ...f,
          weight_kg: toNum(f.weight_kg) ?? 0,
          price: toNum(f.price),
          cost: toNum(f.cost) ?? 0,
          min_stock: toNum(f.min_stock) ?? 0,
          vat_rate: toNum(f.vat_rate) ?? 0,
          expires_at: f.expires_at || null,
          ikpu: f.ikpu || undefined,
          package_code: f.package_code || undefined,
          active,
        },
      });
      clearApiCache();
      onDone();
    } catch (e) {
      setError(errorText(e));
      setSaving(false);
    }
  }

  const num = { keyboardType: "decimal-pad" as const };
  return (
    <Sheet open onClose={onClose} title={initial.id ? t("Tovarni tahrirlash") : t("Yangi tovar")}>
      <Field label={t("Nomi")}>
        <Input value={f.name} onChangeText={set("name")} />
      </Field>
      <Field label="SKU">
        <Input value={f.sku} onChangeText={set("sku")} autoCapitalize="characters" />
      </Field>
      <Field label={t("Kategoriya")}>
        <Input value={f.category} onChangeText={set("category")} />
      </Field>
      <View className="flex-row gap-3">
        <Field label={t("O'lchov birligi")} className="flex-1">
          <Input value={f.unit} onChangeText={set("unit")} />
        </Field>
        <Field label={t("Og'irlik, kg")} className="flex-1">
          <Input value={f.weight_kg} onChangeText={set("weight_kg")} {...num} />
        </Field>
      </View>
      <View className="flex-row gap-3">
        <Field label={t("Sotuv narxi")} className="flex-1">
          <Input value={f.price} onChangeText={set("price")} {...num} />
        </Field>
        <Field label={t("Tannarx")} className="flex-1">
          <Input value={f.cost} onChangeText={set("cost")} {...num} />
        </Field>
      </View>
      <View className="flex-row gap-3">
        <Field label={t("Minimal qoldiq")} className="flex-1">
          <Input value={f.min_stock} onChangeText={set("min_stock")} {...num} />
        </Field>
        <Field label={t("QQS, %")} className="flex-1">
          <Input value={f.vat_rate} onChangeText={set("vat_rate")} {...num} />
        </Field>
      </View>
      <Field label={t("Yaroqlilik muddati")} hint="YYYY-MM-DD">
        <Input value={f.expires_at} onChangeText={set("expires_at")} placeholder="2027-12-31" keyboardType="numbers-and-punctuation" />
      </Field>
      <Field label={t("IKPU (MXIK) kodi")}>
        <Input value={f.ikpu} onChangeText={set("ikpu")} keyboardType="number-pad" placeholder={t("17 ta raqam")} maxLength={17} />
      </Field>
      <Field label={t("O'ram kodi")}>
        <Input value={f.package_code} onChangeText={set("package_code")} />
      </Field>
      <Toggle label={t("Sotuvda")} value={active} onChange={setActive} />
      {error && <Alert>{error}</Alert>}
      <Button loading={saving} onPress={submit}>
        {t("Saqlash")}
      </Button>
    </Sheet>
  );
}
