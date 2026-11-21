import { router } from "expo-router";
import { CircleCheck, Clock, MapPin, Phone, Route, Timer, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { Linking, ScrollView, View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { api, errorText } from "@/shared/lib/api";
import { fmtDate, fmtMoney } from "@/shared/lib/format";
import { can } from "@/shared/lib/roles";
import { useMe } from "@/shared/lib/session";
import { clearApiCache, useApi } from "@/shared/lib/useApi";
import { usePaged } from "@/shared/lib/usePaged";
import { StatusBadge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, InfoRow, KpiCard } from "@/shared/ui/Card";
import { Chips, SearchInput } from "@/shared/ui/Chips";
import { Select } from "@/shared/ui/Field";
import { ItemWrap, ListView } from "@/shared/ui/ListView";
import { Alert } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";

interface Delivery {
  id: number;
  order_id: number;
  order_number: string;
  status: string;
  total: number;
  client_name: string;
  region: string;
  address: string | null;
  phone: string | null;
  courier_id: number | null;
  courier_name: string | null;
  vehicle: string | null;
  warehouse_name: string;
  weight_kg: number;
  scheduled_at: string;
  delivered_at: string | null;
}
interface Summary {
  summary: { pending: number; on_route: number; delivered_today: number; failed: number; on_time_pct: number | null };
}

export function DeliveriesList({ initialStatus = "" }: { initialStatus?: string }) {
  const t = useT();
  const me = useMe();
  const list = usePaged<Delivery, Summary>("/deliveries", initialStatus);
  const manager = me.role === "admin" || me.role === "manager";
  const couriers = useApi<{ items: { id: number; full_name: string }[] }>(manager ? "/users?role=courier&status=active" : null);
  const [busy, setBusy] = useState<number>();
  const [error, setError] = useState<string>();
  const s = list.first?.summary;
  const canUpdate = can(me.role, "delivery");

  async function patch(id: number, body: Record<string, unknown>) {
    setBusy(id);
    setError(undefined);
    try {
      await api(`/deliveries/${id}`, { method: "PATCH", json: body });
      clearApiCache();
      list.reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <ListView
      list={list}
      keyOf={(d) => d.id}
      emptyTitle={t("Yetkazish topilmadi")}
      header={
        <View className="gap-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-3 px-4">
            {[
              { label: t("Kutilmoqda"), value: s?.pending, icon: Clock, tone: "navy" as const },
              { label: t("Yo'lda"), value: s?.on_route, icon: Route, tone: "amber" as const },
              { label: t("Bugun yetkazildi"), value: s?.delivered_today, icon: CircleCheck, tone: "brand" as const },
              { label: t("Muvaffaqiyatsiz"), value: s?.failed, icon: TriangleAlert, tone: "red" as const },
              { label: t("O'z vaqtida"), value: s?.on_time_pct != null ? `${s.on_time_pct}%` : undefined, icon: Timer, tone: "brand" as const },
            ].map((k) => (
              <View key={k.label} className="w-36">
                <KpiCard label={k.label} value={k.value ?? "…"} icon={k.icon} tone={k.tone} />
              </View>
            ))}
          </ScrollView>
          <View className="px-4">
            <SearchInput value={list.q} onChange={list.setQ} placeholder={t("Buyurtma, mijoz, hudud…")} />
          </View>
          <Chips
            options={[
              { value: "", label: t("Barchasi") },
              { value: "pending", label: t("Kutilmoqda") },
              { value: "on_route", label: t("Yo'lda") },
              { value: "delivered", label: t("Yetkazildi") },
              { value: "failed", label: t("Muvaffaqiyatsiz") },
            ]}
            value={list.status}
            onChange={list.setStatus}
          />
          {error && (
            <View className="px-4">
              <Alert>{error}</Alert>
            </View>
          )}
        </View>
      }
      renderItem={(d) => (
        <ItemWrap>
          <Card className="p-4">
            <View className="flex-row items-start gap-3">
              <View className="flex-1">
                <Txt weight="bold" className="text-[15px]" numberOfLines={1}>
                  {d.client_name}
                </Txt>
                <Txt weight="semibold" className="text-xs text-brand-700" onPress={() => router.push(`/orders/${d.order_id}`)}>
                  {d.order_number} · {d.warehouse_name}
                </Txt>
              </View>
              <StatusBadge status={d.status} />
            </View>
            <InfoRow icon={MapPin} value={d.address ?? d.region} />
            {d.phone ? <InfoRow icon={Phone} value={d.phone} onPress={() => Linking.openURL(`tel:${d.phone!.replace(/\s/g, "")}`)} /> : null}
            <View className="flex-row justify-between">
              <Txt className="text-xs text-ink-500">
                {t("{n} kg", { n: Number(d.weight_kg).toFixed(0) })} · {fmtMoney(d.total)}
              </Txt>
              <Txt className="text-xs text-ink-500">{d.delivered_at ? `✓ ${fmtDate(d.delivered_at, true)}` : fmtDate(d.scheduled_at)}</Txt>
            </View>

            {manager && d.status !== "delivered" ? (
              <View className="mt-3">
                <Select
                  title={t("Kuryer")}
                  value={d.courier_id ? String(d.courier_id) : ""}
                  onChange={(v) => patch(d.id, { courier_id: v ? Number(v) : null })}
                  options={[{ value: "", label: t("Biriktirilmagan") }, ...(couriers.data?.items.map((c) => ({ value: String(c.id), label: c.full_name })) ?? [])]}
                />
              </View>
            ) : (
              <Txt className="mt-2 text-xs text-ink-600">
                {t("Kuryer")}: {d.courier_name ?? t("Biriktirilmagan")}
                {d.vehicle ? ` · ${d.vehicle}` : ""}
              </Txt>
            )}

            {canUpdate && d.status !== "delivered" && (
              <View className="mt-3 flex-row flex-wrap gap-2">
                {d.status === "pending" && (
                  <Button size="sm" variant="secondary" disabled={busy === d.id} onPress={() => patch(d.id, { status: "on_route" })}>
                    {t("Yo'lga chiqdi")}
                  </Button>
                )}
                <Button size="sm" loading={busy === d.id} onPress={() => patch(d.id, { status: "delivered" })}>
                  {t("Yetkazildi")}
                </Button>
                {d.status === "on_route" && (
                  <Button size="sm" variant="ghost" disabled={busy === d.id} onPress={() => patch(d.id, { status: "failed", note: "Mijoz qabul qilmadi" })}>
                    {t("Muvaffaqiyatsiz")}
                  </Button>
                )}
              </View>
            )}
          </Card>
        </ItemWrap>
      )}
    />
  );
}
