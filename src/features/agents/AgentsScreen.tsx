import { MapPin, Phone, Store, TrendingDown, TrendingUp } from "lucide-react-native";
import { Linking, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useT } from "@/shared/i18n/I18nProvider";
import { currency, fmtCompact, fmtMoney, pctChange } from "@/shared/lib/format";
import { useApi } from "@/shared/lib/useApi";
import { Card, Divider, Progress, SectionTitle } from "@/shared/ui/Card";
import { ScrollScreen } from "@/shared/ui/Screen";
import { ErrorState, Loading } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";
import { colors, gradients } from "@/theme/tokens";

interface Agent {
  id: number;
  full_name: string;
  phone: string | null;
  region: string | null;
  monthly_plan: number;
  revenue_month: number;
  revenue_prev_month: number;
  orders_month: number;
  clients: number;
  active_clients: number;
  clients_debt: number;
  plan_pct: number | null;
}
interface Courier {
  id: number;
  full_name: string;
  phone: string | null;
  delivered_month: number;
  active: number;
  failed: number;
}

export function AgentsScreen() {
  const t = useT();
  const { data, error, loading, reload } = useApi<{ agents: Agent[]; couriers: Courier[] }>("/agents");
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <Loading full />;

  const now = new Date();
  const expected = (now.getDate() / new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()) * 100;

  return (
    <ScrollScreen refreshing={loading} onRefresh={reload}>
      <Txt className="text-sm text-ink-500">{t("Oylik reja bajarilishi. Bugungi kutilgan sur'at: {n}%", { n: expected.toFixed(0) })}</Txt>
      {data.agents.map((a, i) => {
        const pct = a.plan_pct ?? 0;
        const trend = pctChange(a.revenue_month, a.revenue_prev_month);
        const behind = pct < expected * 0.85;
        return (
          <Card key={a.id} className="p-4">
            <View className="flex-row items-center gap-3">
              <LinearGradient colors={gradients.avatar} style={{ width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" }}>
                <Txt weight="extrabold" className="text-lg text-white">
                  {a.full_name.slice(0, 1)}
                </Txt>
              </LinearGradient>
              {i < 3 && (
                <View className="absolute left-9 top-[-4px] size-5 items-center justify-center rounded-full bg-amber-400">
                  <Txt weight="extrabold" className="text-[10px] text-amber-950">
                    {i + 1}
                  </Txt>
                </View>
              )}
              <View className="flex-1">
                <Txt weight="bold" numberOfLines={1}>
                  {a.full_name}
                </Txt>
                <View className="flex-row items-center gap-3">
                  <View className="flex-row items-center gap-1">
                    <MapPin size={11} color={colors.ink[400]} />
                    <Txt className="text-xs text-ink-500">{a.region ?? "—"}</Txt>
                  </View>
                  {a.phone ? (
                    <Pressable onPress={() => Linking.openURL(`tel:${a.phone!.replace(/\s/g, "")}`)} className="flex-row items-center gap-1">
                      <Phone size={11} color={colors.brand[600]} />
                      <Txt className="text-xs text-brand-700">{a.phone}</Txt>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
            <View className="mt-4 flex-row items-end justify-between">
              <View>
                <Txt className="text-xs text-ink-500">{t("Shu oy sotuv")}</Txt>
                <Txt weight="extrabold" className="text-xl">
                  {fmtCompact(a.revenue_month)}
                </Txt>
              </View>
              {trend !== null && (
                <View className="flex-row items-center gap-1">
                  {trend >= 0 ? <TrendingUp size={14} color={colors.brand[700]} /> : <TrendingDown size={14} color="#dc2626" />}
                  <Txt weight="bold" className={`text-xs ${trend >= 0 ? "text-brand-700" : "text-red-600"}`}>
                    {t("{n}% o'tgan oyga", { n: Math.abs(trend).toFixed(0) })}
                  </Txt>
                </View>
              )}
            </View>
            <View className="mb-1.5 mt-3 flex-row justify-between">
              <Txt className="text-xs text-ink-500">{t("Reja: {sum}", { sum: fmtCompact(a.monthly_plan) })}</Txt>
              <Txt weight="bold" className={`text-xs ${behind ? "text-amber-700" : "text-brand-700"}`}>
                {pct.toFixed(0)}%
              </Txt>
            </View>
            <Progress pct={pct} tone={behind ? "amber" : "brand"} />
            <View className="mt-4 flex-row border-t border-ink-100 pt-3">
              <View className="flex-1 items-center">
                <Txt className="text-[11px] text-ink-500">{t("Buyurtma")}</Txt>
                <Txt weight="bold">{a.orders_month}</Txt>
              </View>
              <View className="flex-1 items-center">
                <View className="flex-row items-center gap-1">
                  <Store size={11} color={colors.ink[500]} />
                  <Txt className="text-[11px] text-ink-500">{t("Faol")}</Txt>
                </View>
                <Txt weight="bold">
                  {a.active_clients}/{a.clients}
                </Txt>
              </View>
              <View className="flex-1 items-center">
                <Txt className="text-[11px] text-ink-500">{t("Mijoz qarzi")}</Txt>
                <Txt weight="bold" className="text-amber-700">
                  {fmtCompact(a.clients_debt)}
                </Txt>
              </View>
            </View>
          </Card>
        );
      })}

      <Card className="p-4">
        <SectionTitle>{t("Kuryerlar")}</SectionTitle>
        {data.couriers.map((c, i) => {
          const rate = c.delivered_month + c.failed ? (c.delivered_month / (c.delivered_month + c.failed)) * 100 : 100;
          return (
            <View key={c.id}>
              {i > 0 && <Divider />}
              <View className="py-3">
                <View className="flex-row items-center justify-between">
                  <Txt weight="semibold" className="text-sm">
                    {c.full_name}
                  </Txt>
                  <Txt weight="bold" className="text-xs">
                    {rate.toFixed(0)}%
                  </Txt>
                </View>
                <Txt className="mb-1.5 text-[11px] text-ink-500">
                  {t("Shu oy yetkazdi")}: {c.delivered_month} · {t("Faol")}: {c.active} · {t("Muvaffaqiyatsiz")}: {c.failed}
                </Txt>
                <Progress pct={rate} tone="brand" />
              </View>
            </View>
          );
        })}
        <Txt className="mt-2 text-xs text-ink-400">
          {t("Rejalar summasi, {cur}:", { cur: currency() })} {fmtMoney(data.agents.reduce((s, a) => s + Number(a.monthly_plan), 0))}
        </Txt>
      </Card>
    </ScrollScreen>
  );
}
