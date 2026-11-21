import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { trData } from "@/shared/i18n/translate";
import { api, errorText } from "@/shared/lib/api";
import { fmtDate, fmtNum } from "@/shared/lib/format";
import { can } from "@/shared/lib/roles";
import { useMe } from "@/shared/lib/session";
import { clearApiCache, useApi } from "@/shared/lib/useApi";
import { usePaged } from "@/shared/lib/usePaged";
import { StatusBadge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, Progress } from "@/shared/ui/Card";
import { Chips, SearchInput } from "@/shared/ui/Chips";
import { Field, Input, Toggle, toNum } from "@/shared/ui/Field";
import { ItemWrap, ListView } from "@/shared/ui/ListView";
import { SearchSelect, WarehouseSelect, type WarehouseOption } from "@/shared/ui/SearchSelect";
import { Sheet } from "@/shared/ui/Sheet";
import { Alert } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";

interface StockRow {
  warehouse_id: number;
  product_id: number;
  quantity: number;
  reserved: number;
  available: number;
  sku: string;
  product_name: string;
  category: string;
  unit: string;
  min_stock: number;
  warehouse_name: string;
}
interface Movement {
  id: number;
  type: string;
  quantity: number;
  reference: string | null;
  note: string | null;
  created_at: string;
  product_name: string;
  sku: string;
  warehouse_name: string;
  to_warehouse_name: string | null;
  user_name: string | null;
}
type MoveType = "in" | "out" | "transfer";

export function StockScreen({ initialLow = false, initialWarehouse }: { initialLow?: boolean; initialWarehouse?: string }) {
  const t = useT();
  const me = useMe();
  const [tab, setTab] = useState<"stock" | "moves">("stock");
  // `undefined` = untouched, so a `?warehouse_id=` deep link stays in effect until the user picks.
  const [picked, setWarehouse] = useState<WarehouseOption | null>();
  const linked = useApi<WarehouseOption>(picked === undefined && initialWarehouse ? `/warehouses/${initialWarehouse}` : null);
  const warehouse = picked === undefined ? (linked.data ?? null) : picked;
  const [low, setLow] = useState(initialLow);
  const [move, setMove] = useState<MoveType | null>(null);
  const wid = picked === undefined ? initialWarehouse : picked ? String(picked.id) : undefined;
  const stock = usePaged<StockRow>("/stock", "", { warehouse_id: wid, low: low ? "true" : undefined });
  const moves = usePaged<Movement>("/stock/movements", "", { warehouse_id: wid });

  const header = (
    <View className="gap-3">
      {can(me.role, "catalog") && (
        <View className="flex-row gap-2 px-4">
          <Button size="sm" variant="secondary" icon={ArrowDownLeft} className="flex-1" onPress={() => setMove("in")}>
            {t("Kirim")}
          </Button>
          <Button size="sm" variant="secondary" icon={ArrowUpRight} className="flex-1" onPress={() => setMove("out")}>
            {t("Chiqim")}
          </Button>
          <Button size="sm" icon={ArrowLeftRight} className="flex-1" onPress={() => setMove("transfer")}>
            {t("Ko'chirish")}
          </Button>
        </View>
      )}
      <Chips
        options={[
          { value: "stock", label: t("Qoldiqlar") },
          { value: "moves", label: t("Harakatlar tarixi") },
        ]}
        value={tab}
        onChange={setTab}
      />
      <View className="gap-3 px-4">
        <WarehouseSelect title={t("Ombor")} placeholder={t("Barcha omborlar")} value={warehouse} onChange={setWarehouse} clearable />
        {tab === "stock" ? (
          <>
            <SearchInput value={stock.q} onChange={stock.setQ} placeholder={t("Tovar yoki SKU…")} />
            <Toggle label={t("Faqat kam qoldiq")} value={low} onChange={setLow} />
          </>
        ) : null}
      </View>
      {tab === "moves" && (
        <Chips
          options={[
            { value: "", label: t("Barchasi") },
            { value: "in", label: t("Kirim") },
            { value: "out", label: t("Chiqim") },
            { value: "transfer", label: t("Ko'chirish") },
            { value: "adjust", label: t("Tuzatish") },
          ]}
          value={moves.status}
          onChange={moves.setStatus}
        />
      )}
    </View>
  );

  return (
    <View className="flex-1">
      {tab === "stock" ? (
        <ListView
          list={stock}
          keyOf={(s) => `${s.warehouse_id}-${s.product_id}`}
          emptyTitle={t("Qoldiq topilmadi")}
          header={header}
          renderItem={(s) => {
            const ratio = s.min_stock ? s.available / (s.min_stock * 3) : 1;
            const lowNow = s.available <= s.min_stock;
            return (
              <ItemWrap>
                <Card className="p-4">
                  <Txt weight="bold" className="text-[15px]" numberOfLines={1}>
                    {s.product_name}
                  </Txt>
                  <Txt className="text-xs text-ink-500" numberOfLines={1}>
                    {s.sku} · {trData(s.category)} · {s.warehouse_name}
                  </Txt>
                  <View className="mt-3 flex-row justify-between">
                    <Stat label={t("Jami qoldiq")} value={fmtNum(s.quantity)} />
                    <Stat label={t("Band")} value={fmtNum(s.reserved)} color="text-violet-700" />
                    <Stat label={t("Bo'sh")} value={`${fmtNum(s.available)} ${trData(s.unit)}`} color={lowNow ? "text-red-600" : "text-ink-900"} />
                    <Stat label={t("Minimum")} value={fmtNum(s.min_stock)} color="text-ink-500" />
                  </View>
                  <View className="mt-2">
                    <Progress pct={Math.max(4, ratio * 100)} tone={lowNow ? "red" : ratio < 1 ? "amber" : "brand"} />
                  </View>
                </Card>
              </ItemWrap>
            );
          }}
        />
      ) : (
        <ListView
          list={moves}
          keyOf={(m) => m.id}
          emptyTitle={t("Harakat yo'q")}
          header={header}
          renderItem={(m) => (
            <ItemWrap>
              <Card className="p-4">
                <View className="flex-row items-start gap-3">
                  <View className="flex-1">
                    <Txt weight="bold" className="text-[15px]" numberOfLines={1}>
                      {m.product_name}
                    </Txt>
                    <Txt className="text-xs text-ink-500" numberOfLines={1}>
                      {m.warehouse_name}
                      {m.to_warehouse_name ? ` → ${m.to_warehouse_name}` : ""}
                    </Txt>
                  </View>
                  <Txt weight="extrabold" className={`text-base ${m.type === "out" || m.quantity < 0 ? "text-amber-700" : "text-brand-700"}`}>
                    {m.type === "out" ? "−" : m.quantity > 0 ? "+" : ""}
                    {fmtNum(m.quantity)}
                  </Txt>
                </View>
                <View className="mt-2 flex-row items-center justify-between gap-2">
                  <StatusBadge status={m.type} />
                  <Txt className="flex-1 text-right text-[11px] text-ink-500" numberOfLines={1}>
                    {fmtDate(m.created_at, true)} · {m.reference ?? (trData(m.note) || "—")} · {m.user_name ?? "—"}
                  </Txt>
                </View>
              </Card>
            </ItemWrap>
          )}
        />
      )}
      {move && (
        <MoveSheet
          type={move}
          onClose={() => setMove(null)}
          onDone={() => {
            setMove(null);
            stock.reload();
            moves.reload();
          }}
        />
      )}
    </View>
  );
}

function Stat({ label, value, color = "text-ink-900" }: { label: string; value: string; color?: string }) {
  return (
    <View>
      <Txt className="text-[10px] text-ink-500">{label}</Txt>
      <Txt weight="bold" className={`text-sm ${color}`}>
        {value}
      </Txt>
    </View>
  );
}

function MoveSheet({ type, onClose, onDone }: { type: MoveType; onClose: () => void; onDone: () => void }) {
  const t = useT();
  const [from, setFrom] = useState<WarehouseOption | null>(null);
  const [to, setTo] = useState<WarehouseOption | null>(null);
  const [product, setProduct] = useState<{ id: number; name: string; sku: string } | null>(null);
  const [qty, setQty] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [key] = useState(() => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

  async function submit() {
    setError(undefined);
    if (!from || !product || (type === "transfer" && !to)) return setError(t("Ro'yxatdan tanlang"));
    setSaving(true);
    try {
      await api("/stock/movements", {
        method: "POST",
        json: { type, warehouse_id: from.id, to_warehouse_id: to?.id, product_id: product.id, quantity: toNum(qty), note: note.trim() || undefined, idempotency_key: key },
      });
      clearApiCache();
      onDone();
    } catch (e) {
      setError(errorText(e));
      setSaving(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={type === "in" ? t("Kirim qilish") : type === "out" ? t("Chiqim qilish") : t("Omborlararo ko'chirish")}>
      <Field label={type === "transfer" ? t("Qaysi ombordan") : t("Ombor")}>
        <WarehouseSelect title={t("Ombor")} params={{ active: "true" }} value={from} onChange={setFrom} />
      </Field>
      {type === "transfer" && (
        <Field label={t("Qaysi omborga")}>
          <WarehouseSelect title={t("Qaysi omborga")} params={{ active: "true" }} value={to} onChange={setTo} />
        </Field>
      )}
      <Field label={t("Tovar")}>
        <SearchSelect path="/products" title={t("Tovar")} value={product} onChange={setProduct} display={(p) => `${p.name} (${p.sku})`} />
      </Field>
      <Field label={t("Miqdor")}>
        <Input value={qty} onChangeText={setQty} keyboardType="number-pad" />
      </Field>
      <Field label={t("Izoh")}>
        <Input value={note} onChangeText={setNote} multiline placeholder={type === "in" ? t("Yetkazib beruvchi, nakladnoy raqami…") : ""} />
      </Field>
      {error && <Alert>{error}</Alert>}
      <Button loading={saving} disabled={!toNum(qty)} onPress={submit}>
        {t("Tasdiqlash")}
      </Button>
    </Sheet>
  );
}