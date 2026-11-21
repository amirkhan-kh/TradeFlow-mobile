import { router } from "expo-router";
import { Plus, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { api, errorText } from "@/shared/lib/api";
import { fmtMoney, fmtNum } from "@/shared/lib/format";
import { clearApiCache } from "@/shared/lib/useApi";
import { Button, IconButton } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Field, Input, toNum } from "@/shared/ui/Field";
import { ScrollScreen } from "@/shared/ui/Screen";
import { SearchSelect, WarehouseSelect, type WarehouseOption } from "@/shared/ui/SearchSelect";
import { Alert } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";

interface ClientOpt {
  id: number;
  name: string;
  region: string;
  balance: number;
  credit_limit: number;
}
interface ProductOpt {
  id: number;
  name: string;
  sku: string;
  price: number;
  stock: number;
  reserved: number;
  unit: string;
}
interface Line {
  key: number;
  product: ProductOpt | null;
  qty: string;
}

let seq = 1;

export function OrderForm() {
  const t = useT();
  const [client, setClient] = useState<ClientOpt | null>(null);
  const [warehouse, setWarehouse] = useState<WarehouseOption | null>(null);
  const [lines, setLines] = useState<Line[]>([{ key: seq++, product: null, qty: "1" }]);
  const [discount, setDiscount] = useState("0");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const subtotal = lines.reduce((s, l) => s + (l.product ? l.product.price * (toNum(l.qty) ?? 0) : 0), 0);
  const disc = Math.min(50, Math.max(0, toNum(discount) ?? 0));
  const total = Math.round(subtotal * (1 - disc / 100));
  const over = client && client.credit_limit > 0 && Number(client.balance) + total > Number(client.credit_limit);

  const patch = (key: number, p: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...p } : l)));

  async function submit() {
    setError(undefined);
    if (!client || !warehouse) return setError(t("Ro'yxatdan tanlang"));
    const items = lines.filter((l) => l.product && (toNum(l.qty) ?? 0) > 0).map((l) => ({ product_id: l.product!.id, quantity: toNum(l.qty)! }));
    setSaving(true);
    try {
      const o = await api<{ id: number }>("/orders", { method: "POST", json: { client_id: client.id, warehouse_id: warehouse.id, discount_pct: disc, note: note.trim() || undefined, items } });
      clearApiCache();
      router.replace(`/orders/${o.id}`);
    } catch (e) {
      setError(errorText(e));
      setSaving(false);
    }
  }

  return (
    <ScrollScreen>
      <Card className="gap-4 p-4">
        <Field label={t("Mijoz (savdo nuqtasi)")}>
          <SearchSelect<ClientOpt>
            path="/clients"
            title={t("Mijoz (savdo nuqtasi)")}
            value={client}
            onChange={setClient}
            display={(c) => c.name}
            hint={(c) => t("Qarz {debt} · limit {limit}", { debt: fmtMoney(c.balance), limit: c.credit_limit ? fmtMoney(c.credit_limit) : t("cheksiz") })}
          />
        </Field>
        <Field label={t("Ombor")}>
          <WarehouseSelect title={t("Ombor")} params={{ active: "true" }} value={warehouse} onChange={setWarehouse} />
        </Field>
      </Card>

      <Card className="gap-3 p-4">
        <Txt weight="bold">{t("Tovar")}</Txt>
        <Txt className="-mt-2 text-xs text-ink-500">{t("Narxlar tovar kartochkasidan olinadi")}</Txt>
        {lines.map((l) => (
          <View key={l.key} className="gap-2 rounded-input border border-ink-100 bg-ink-50 p-3">
            <View className="flex-row items-center gap-2">
              <View className="flex-1">
                <SearchSelect<ProductOpt>
                  path="/products"
                  params={{ active: "true" }}
                  title={t("Tovar qidiring…")}
                  placeholder={t("Tovar qidiring…")}
                  value={l.product}
                  onChange={(p) => patch(l.key, { product: p })}
                  display={(p) => p.name}
                  hint={(p) => `${p.sku} · ${fmtMoney(p.price)} · ${t("bo'sh {n}", { n: fmtNum(p.stock - p.reserved) })}`}
                />
              </View>
              {lines.length > 1 && <IconButton icon={Trash2} label={t("Qatorni o'chirish")} color="#dc2626" onPress={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} />}
            </View>
            <View className="flex-row items-center gap-3">
              <Input value={l.qty} onChangeText={(v) => patch(l.key, { qty: v })} keyboardType="number-pad" className="w-28" accessibilityLabel={t("Miqdor")} />
              <Txt weight="bold" className="flex-1 text-right text-sm">
                {l.product ? fmtMoney(l.product.price * (toNum(l.qty) ?? 0)) : "—"}
              </Txt>
            </View>
          </View>
        ))}
        <Button variant="secondary" size="sm" icon={Plus} onPress={() => setLines((ls) => [...ls, { key: seq++, product: null, qty: "1" }])}>
          {t("Qator qo'shish")}
        </Button>
      </Card>

      <Card className="gap-4 p-4">
        <Field label={t("Chegirma, %")}>
          <Input value={discount} onChangeText={setDiscount} keyboardType="number-pad" />
        </Field>
        <Field label={t("Izoh")}>
          <Input value={note} onChangeText={setNote} multiline />
        </Field>
        <View className="gap-1 border-t border-ink-100 pt-3">
          <View className="flex-row justify-between">
            <Txt className="text-sm text-ink-500">{t("Oraliq summa")}</Txt>
            <Txt weight="semibold" className="text-sm">
              {fmtMoney(subtotal)}
            </Txt>
          </View>
          <View className="flex-row justify-between">
            <Txt weight="bold">{t("Summa")}</Txt>
            <Txt weight="extrabold" className="text-lg">
              {fmtMoney(total)}
            </Txt>
          </View>
          {client && (
            <Txt className={`text-xs ${over ? "text-red-600" : "text-ink-500"}`}>
              {t("Mijoz qarzi: {debt} / limit {limit}", { debt: fmtMoney(client.balance), limit: client.credit_limit ? fmtMoney(client.credit_limit) : t("cheksiz") })}
              {over ? ` — ${t("kredit limiti oshadi!")}` : ""}
            </Txt>
          )}
        </View>
      </Card>

      {error && <Alert>{error}</Alert>}
      <Button loading={saving} onPress={submit} testID="order-submit">
        {t("Buyurtma yaratish")}
      </Button>
    </ScrollScreen>
  );
}
