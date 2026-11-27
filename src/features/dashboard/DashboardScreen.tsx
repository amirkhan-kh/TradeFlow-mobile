import { router } from "expo-router";
import { Boxes, ChevronRight, ClipboardCheck, HandCoins, PackageCheck, ShoppingCart, Sparkles, Truck, TriangleAlert, Wallet, Warehouse } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { trData } from "@/shared/i18n/translate";
import { fmtCompact, fmtCompactMoney, fmtDate, fmtMoney, fmtNum, pctChange } from "@/shared/lib/format";
import { useMe } from "@/shared/lib/session";
import { useApi } from "@/shared/lib/useApi";
import { StatusBadge } from "@/shared/ui/Badge";
import { Card, Divider, KpiCard, Progress, SectionTitle } from "@/shared/ui/Card";
import { ScrollScreen } from "@/shared/ui/Screen";
import { ErrorState, Loading } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";
import { colors } from "@/theme/tokens";
import { canUseAssistant } from "../insights/agents";
import type { InsightsData } from "../insights/types";
import { DailyChart, PairBars, StatusPie } from "./Charts";

interface Dashboard {
  kpi: {
    revenue_month: number;
    revenue_prev_same_period: number;
    orders_month: number;
    orders_today: number;
    active_warehouses: number;
    stock_value: number;
    shipped_tons_month: number;
    active_deliveries: number;
    receivables: number;
    overlimit_clients: number;
    collected_month: number;
    clients: number;
    active_audits: number;
    low_stock: number;
  };
  flow: { month: string; inbound: number; outbound: number }[];
  sales: { month: string; revenue: number; collected: number }[];
  daily: { day: string; revenue: number; orders: number }[];
  topProducts: { id: number; name: string; category: string; units: number; revenue: number }[];
  regions: { region: string; revenue: number; orders: number }[];
  statuses: { status: string; count: number }[];
  audits: { id: number; number: string; status: string; created_at: string; warehouse_name: string; city: string; auditor_name: string | null; mismatch_count: number }[];
  lowStock: { name: string; sku: string; warehouse_name: string; available: number; min_stock: number }[];
  recentOrders: { id: number; number: string; status: string; total: number; created_at: string; client_name: string }[];
}

export function DashboardScreen() {
  const t = useT();
  const me = useMe();
  const { data: d, error, loading, reload } = useApi<Dashboard>("/dashboard");
  const insights = useApi<InsightsData>("/insights");
  const showAssistant = canUseAssistant(me.role);

  if (error && !d) return <ErrorState message={error} onRetry={reload} />;
  if (!d) return <Loading full />;

  const k = d.kpi;
  const trend = pctChange(k.revenue_month, k.revenue_prev_same_period);
  const signals = insights.data?.agents.flatMap((a) => a.findings).filter((f) => f.severity === "high").length ?? 0;
  const maxRegion = Math.max(1, ...d.regions.map((r) => Number(r.revenue)));
  const maxProduct = Math.max(1, ...d.topProducts.map((p) => Number(p.revenue)));

  return (
    <ScrollScreen
      refreshing={loading}
      onRefresh={() => {
        reload();
        insights.reload();
      }}
    >
      {signals > 0 && (
        <Pressable accessibilityRole="button" onPress={() => router.push("/m/insights")} className="flex-row items-center gap-3 rounded-card bg-navy-700 p-4 active:opacity-90" testID="dash-insights-banner">
          <View className="size-10 items-center justify-center rounded-icon bg-white/15">
            <Sparkles size={20} color="#ffffff" />
          </View>
          <View className="flex-1">
            <Txt weight="bold" className="text-sm text-white">
              {t("Aqlli agentlar diqqat talab qiladi")}
            </Txt>
            <Txt className="text-xs text-sky">{t("Muhim signallar")}: {signals}</Txt>
          </View>
          <ChevronRight size={18} color="#ffffff" />
        </Pressable>
      )}
      {showAssistant ? (
        <Pressable accessibilityRole="button" onPress={() => router.push("/m/assistant")} className="flex-row items-center gap-3 rounded-card border border-ink-200 bg-white p-4 active:bg-ink-50" testID="dash-assistant-banner">
          <View className="size-10 items-center justify-center rounded-icon bg-brand-50">
            <Sparkles size={20} color={colors.brand[700]} />
          </View>
          <View className="flex-1">
            <Txt weight="bold" className="text-sm">
              {t("Agent bilan gaplashish")}
            </Txt>
            <Txt className="text-xs text-ink-500">{t("Savolingizni yozing")}</Txt>
          </View>
          <ChevronRight size={18} color={colors.ink[300]} />
        </Pressable>
      ) : null}

      <View className="gap-3">
        <View className="flex-row gap-3">
          <KpiCard
            label={t("Oylik tushum")}
            value={fmtCompactMoney(k.revenue_month)}
            icon={Wallet}
            hint={trend !== null ? `${trend >= 0 ? "+" : ""}${trend.toFixed(0)}% ${t("o'tgan oyga nisbatan")}` : undefined}
          />
          <KpiCard label={t("Buyurtmalar (oy)")} value={fmtNum(k.orders_month)} icon={ShoppingCart} tone="navy" hint={t("bugun: {n}", { n: k.orders_today })} onPress={() => router.push("/orders")} />
        </View>
        <View className="flex-row gap-3">
          <KpiCard label={t("Faol omborlar")} value={fmtNum(k.active_warehouses)} icon={Warehouse} tone="violet" hint={t("zaxira: {sum}", { sum: fmtCompact(k.stock_value) })} onPress={() => router.push("/m/warehouses")} />
          <KpiCard label={t("Kuzatilgan yuklar")} value={t("{n} t", { n: Number(k.shipped_tons_month).toFixed(1) })} icon={Truck} tone="amber" hint={t("yo'lda: {n}", { n: k.active_deliveries })} onPress={() => router.push("/m/deliveries")} />
        </View>
        <View className="flex-row gap-3">
          <KpiCard label={t("Debitorlik")} value={fmtCompactMoney(k.receivables)} icon={HandCoins} tone="red" hint={t("{n} mijoz limitdan oshgan", { n: k.overlimit_clients })} onPress={() => router.push("/m/clients")} />
          <KpiCard label={t("Undirilgan (oy)")} value={fmtCompactMoney(k.collected_month)} icon={PackageCheck} hint={t("{n} ta mijoz", { n: k.clients })} onPress={() => router.push("/finance")} />
        </View>
        <View className="flex-row gap-3">
          <KpiCard label={t("Faol auditlar")} value={fmtNum(k.active_audits)} icon={ClipboardCheck} tone="navy" hint={t("tekshiruv / tasdiq")} onPress={() => router.push("/m/audits")} />
          <KpiCard label={t("Kam qoldiq")} value={fmtNum(k.low_stock)} icon={TriangleAlert} tone="amber" hint={t("pozitsiya minimumdan past")} onPress={() => router.push("/m/stock")} />
        </View>
      </View>

      <Card className="p-4">
        <SectionTitle>{t("Kunlik tushum — 30 kun")}</SectionTitle>
        <DailyChart data={d.daily} />
      </Card>

      <Card className="p-4">
        <SectionTitle hint={t("sotuv va undirilgan to'lov")}>{t("Sotuv hajmi")}</SectionTitle>
        <PairBars
          data={d.sales.map((s) => ({ month: s.month, a: s.revenue, b: s.collected }))}
          a={{ label: t("Sotuv"), color: colors.brand[500] }}
          b={{ label: t("Undirilgan"), color: colors.sky }}
        />
      </Card>

      <Card className="p-4">
        <SectionTitle hint={t("so'nggi 7 oy, dona")}>{t("Tovar oqimi")}</SectionTitle>
        <PairBars
          data={d.flow.map((f) => ({ month: f.month, a: f.inbound, b: f.outbound }))}
          a={{ label: t("Kirim"), color: colors.navy[500] }}
          b={{ label: t("Chiqim"), color: "#f59e0b" }}
        />
      </Card>

      <Card className="p-4">
        <SectionTitle>{t("Buyurtma holatlari — 30 kun")}</SectionTitle>
        <StatusPie data={d.statuses} />
      </Card>

      <Card className="p-4">
        <SectionTitle>{t("Top tovarlar — 90 kun")}</SectionTitle>
        <View className="gap-3">
          {d.topProducts.map((p, i) => (
            <View key={p.id}>
              <View className="mb-1 flex-row items-center gap-2">
                <Txt weight="bold" className="w-5 text-xs text-ink-400">
                  {i + 1}
                </Txt>
                <View className="flex-1">
                  <Txt weight="semibold" className="text-sm" numberOfLines={1}>
                    {p.name}
                  </Txt>
                  <Txt className="text-[11px] text-ink-500">
                    {trData(p.category)} · {t("{n} dona", { n: fmtNum(p.units) })}
                  </Txt>
                </View>
                <Txt weight="bold" className="text-sm">
                  {fmtCompact(p.revenue)}
                </Txt>
              </View>
              <Progress pct={(Number(p.revenue) / maxProduct) * 100} tone="brand" />
            </View>
          ))}
        </View>
      </Card>

      <Card className="p-4">
        <SectionTitle>{t("Hududlar bo'yicha sotuv")}</SectionTitle>
        <View className="gap-3">
          {d.regions.map((r) => (
            <View key={r.region}>
              <View className="mb-1 flex-row justify-between">
                <Txt weight="medium" className="text-sm">
                  {r.region}
                </Txt>
                <Txt weight="bold" className="text-sm">
                  {fmtCompact(r.revenue)}
                </Txt>
              </View>
              <Progress pct={(Number(r.revenue) / maxRegion) * 100} tone="brand" />
            </View>
          ))}
        </View>
      </Card>

      <Card className="p-4">
        <SectionTitle>{t("Kam qoldiq ogohlantirishi")}</SectionTitle>
        {d.lowStock.length === 0 ? (
          <View className="items-center py-4">
            <Txt weight="bold" className="text-brand-700">
              {t("Hammasi joyida")}
            </Txt>
            <Txt className="text-xs text-ink-500">{t("Minimumdan past qoldiq yo'q")}</Txt>
          </View>
        ) : (
          d.lowStock.map((s, i) => (
            <View key={`${s.sku}-${s.warehouse_name}`}>
              {i > 0 && <Divider />}
              <View className="flex-row items-center gap-3 py-2.5">
                <Boxes size={18} color="#d97706" />
                <View className="flex-1">
                  <Txt weight="semibold" className="text-sm" numberOfLines={1}>
                    {s.name}
                  </Txt>
                  <Txt className="text-[11px] text-ink-500">
                    {s.sku} · {s.warehouse_name}
                  </Txt>
                </View>
                <Txt weight="bold" className="text-sm text-red-600">
                  {fmtNum(s.available)} / {s.min_stock}
                </Txt>
              </View>
            </View>
          ))
        )}
      </Card>

      {d.audits.length > 0 && (
        <Card className="p-4">
          <SectionTitle>{t("Audit oqimi")}</SectionTitle>
          {d.audits.map((a, i) => (
            <Pressable key={a.id} onPress={() => router.push(`/audits/${a.id}`)} className="active:opacity-70">
              {i > 0 && <Divider />}
              <View className="flex-row items-center gap-3 py-2.5">
                <View className="flex-1">
                  <Txt weight="semibold" className="text-sm">
                    {a.number} · {a.warehouse_name}
                  </Txt>
                  <Txt className="text-[11px] text-ink-500">
                    {a.city} · {fmtDate(a.created_at)}
                    {a.mismatch_count ? ` · ${t("Farq")}: ${t("{n} poz.", { n: a.mismatch_count })}` : ""}
                  </Txt>
                </View>
                <StatusBadge status={a.status} />
              </View>
            </Pressable>
          ))}
        </Card>
      )}

      <Card className="p-4">
        <SectionTitle>{t("So'nggi buyurtmalar")}</SectionTitle>
        {d.recentOrders.map((o, i) => (
          <Pressable key={o.id} onPress={() => router.push(`/orders/${o.id}`)} className="active:opacity-70">
            {i > 0 && <Divider />}
            <View className="flex-row items-center gap-3 py-2.5">
              <View className="flex-1">
                <Txt weight="semibold" className="text-sm" numberOfLines={1}>
                  {o.client_name}
                </Txt>
                <Txt className="text-[11px] text-ink-500">
                  {o.number} · {fmtDate(o.created_at, true)}
                </Txt>
              </View>
              <View className="items-end gap-1">
                <Txt weight="bold" className="text-sm">
                  {fmtMoney(o.total)}
                </Txt>
                <StatusBadge status={o.status} />
              </View>
            </View>
          </Pressable>
        ))}
      </Card>
      <Txt className="text-center text-[11px] text-ink-400">{t("Ma'lumotlar real vaqtda yangilanadi")}</Txt>
    </ScrollScreen>
  );
}
