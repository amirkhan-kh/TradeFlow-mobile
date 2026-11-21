import { router, Stack } from "expo-router";
import { Check, MapPin, PackageCheck, Phone, Truck, UserRound, Warehouse, X } from "lucide-react-native";
import { useState } from "react";
import { Alert as RNAlert, Linking, View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { trData } from "@/shared/i18n/translate";
import { api, errorText } from "@/shared/lib/api";
import { fmtDate, fmtMoney, fmtNum } from "@/shared/lib/format";
import { can } from "@/shared/lib/roles";
import { useMe } from "@/shared/lib/session";
import { statusOf } from "@/shared/lib/status";
import { useApi } from "@/shared/lib/useApi";
import { StatusBadge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, Divider, InfoRow, SectionTitle } from "@/shared/ui/Card";
import { Field, Input, Select } from "@/shared/ui/Field";
import { ScrollScreen } from "@/shared/ui/Screen";
import { Sheet } from "@/shared/ui/Sheet";
import { Alert, ErrorState, Loading } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";

interface OrderFull {
  id: number;
  number: string;
  status: string;
  subtotal: number;
  discount_pct: number;
  total: number;
  note: string | null;
  created_at: string;
  client_id: number;
  client_name: string;
  client_phone: string | null;
  client_address: string | null;
  client_balance: number;
  agent_name: string | null;
  warehouse_name: string;
  delivery_status: string | null;
  vehicle: string | null;
  courier_name: string | null;
  items: { id: number; product_name: string; sku: string; unit: string; quantity: number; price: number }[];
}

export function OrderDetail({ id }: { id: string }) {
  const t = useT();
  const me = useMe();
  const { data: o, error, loading, reload } = useApi<OrderFull>(`/orders/${id}`);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>();
  const [ship, setShip] = useState(false);

  if (error && !o) return <ErrorState message={error} onRetry={reload} />;
  if (!o) return <Loading full />;

  async function move(status: string, extra: Record<string, unknown> = {}) {
    setBusy(true);
    setMsg(undefined);
    try {
      await api(`/orders/${id}/status`, { method: "POST", json: { status, ...extra } });
      setShip(false);
      reload();
    } catch (e) {
      setMsg(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const cancel = () =>
    RNAlert.alert(t("Bekor qilish"), t("Buyurtmani bekor qilasizmi?"), [
      { text: t("Yo'q"), style: "cancel" },
      { text: t("Bekor qilish"), style: "destructive", onPress: () => move("cancelled") },
    ]);

  const canMove = can(me.role, "orderStatus");

  return (
    <>
      <Stack.Screen options={{ title: o.number }} />
      <ScrollScreen refreshing={loading} onRefresh={reload}>
        <Card className="p-4">
          <View className="flex-row items-center justify-between">
            <Txt className="text-xs text-ink-500">{fmtDate(o.created_at, true)}</Txt>
            <StatusBadge status={o.status} />
          </View>
          <Txt weight="extrabold" className="mt-2 text-2xl">
            {fmtMoney(o.total)}
          </Txt>
          {o.discount_pct > 0 && (
            <Txt className="text-xs text-ink-500">
              {t("Oraliq summa")}: {fmtMoney(o.subtotal)} · {t("Chegirma {n}%", { n: o.discount_pct })}
            </Txt>
          )}
          {o.note ? <Txt className="mt-2 text-sm text-ink-600">{trData(o.note)}</Txt> : null}
        </Card>

        {msg && <Alert>{msg}</Alert>}

        {canMove && (
          <View className="gap-2">
            {o.status === "new" && (
              <Button icon={Check} loading={busy} onPress={() => move("confirmed")} testID="order-confirm">
                {t("Tasdiqlash")}
              </Button>
            )}
            {o.status === "confirmed" && (
              <Button icon={Truck} loading={busy} onPress={() => setShip(true)} testID="order-ship">
                {t("Yuklash")}
              </Button>
            )}
            {o.status === "shipped" && (
              <Button icon={PackageCheck} loading={busy} onPress={() => move("delivered")} testID="order-deliver">
                {t("Yetkazildi")}
              </Button>
            )}
            {(o.status === "new" || o.status === "confirmed") && (
              <Button variant="secondary" icon={X} disabled={busy} onPress={cancel}>
                {t("Bekor qilish")}
              </Button>
            )}
          </View>
        )}

        <Card className="px-4 py-2">
          <InfoRow icon={UserRound} value={o.client_name} onPress={() => router.push(`/clients/${o.client_id}`)} />
          {o.client_phone ? <InfoRow icon={Phone} value={o.client_phone} onPress={() => Linking.openURL(`tel:${o.client_phone!.replace(/\s/g, "")}`)} /> : null}
          {o.client_address ? <InfoRow icon={MapPin} value={o.client_address} /> : null}
          <Divider />
          <InfoRow label={t("Joriy qarz:")} value={fmtMoney(o.client_balance)} />
          <InfoRow label={t("Agent")} value={o.agent_name ?? "—"} />
          <InfoRow icon={Warehouse} value={o.warehouse_name} />
        </Card>

        {(o.delivery_status || o.courier_name) && (
          <Card className="px-4 py-2">
            <SectionTitle>{t("Logistika")}</SectionTitle>
            <InfoRow label={t("Yetkazish")} value={o.delivery_status ? t(statusOf(o.delivery_status).label) : "—"} />
            <InfoRow label={t("Kuryer")} value={o.courier_name ?? t("Keyinroq biriktiriladi")} />
            <InfoRow label={t("Mashina")} value={o.vehicle ?? "—"} />
          </Card>
        )}

        <Card className="p-4">
          <SectionTitle>
            {t("Pozitsiya")}: {o.items.length}
          </SectionTitle>
          {o.items.map((i, idx) => (
            <View key={i.id}>
              {idx > 0 && <Divider />}
              <View className="flex-row items-center gap-3 py-2.5">
                <View className="flex-1">
                  <Txt weight="semibold" className="text-sm" numberOfLines={2}>
                    {i.product_name}
                  </Txt>
                  <Txt className="text-[11px] text-ink-500">
                    {i.sku} · {fmtNum(i.quantity)} {trData(i.unit)} × {fmtMoney(i.price)}
                  </Txt>
                </View>
                <Txt weight="bold" className="text-sm">
                  {fmtMoney(i.quantity * i.price)}
                </Txt>
              </View>
            </View>
          ))}
        </Card>
      </ScrollScreen>
      <ShipSheet open={ship} onClose={() => setShip(false)} busy={busy} onConfirm={(courier_id, vehicle) => move("shipped", { courier_id, vehicle: vehicle || undefined })} />
    </>
  );
}

function ShipSheet({ open, onClose, busy, onConfirm }: { open: boolean; onClose: () => void; busy: boolean; onConfirm: (courierId: number | null, vehicle: string) => void }) {
  const t = useT();
  const couriers = useApi<{ items: { id: number; full_name: string }[] }>(open ? "/users?role=courier&status=active" : null);
  const [courier, setCourier] = useState("");
  const [vehicle, setVehicle] = useState("");
  return (
    <Sheet open={open} onClose={onClose} title={t("Yuklash va kuryer biriktirish")} description={t("Qoldiq ombordan chiqim qilinadi va mijoz qarziga yoziladi")}>
      <Field label={t("Kuryer")}>
        <Select
          title={t("Kuryer")}
          value={courier}
          onChange={setCourier}
          options={[{ value: "", label: t("Keyinroq biriktiriladi") }, ...(couriers.data?.items.map((c) => ({ value: String(c.id), label: c.full_name })) ?? [])]}
        />
      </Field>
      <Field label={t("Mashina")}>
        <Input value={vehicle} onChangeText={setVehicle} placeholder={t("Mashina raqami")} autoCapitalize="characters" />
      </Field>
      <Button loading={busy} onPress={() => onConfirm(courier ? Number(courier) : null, vehicle.trim())}>
        {t("Yuklashni tasdiqlash")}
      </Button>
    </Sheet>
  );
}
