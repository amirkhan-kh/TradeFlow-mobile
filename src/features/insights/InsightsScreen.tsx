import { router } from "expo-router";
import { ChevronRight, ClipboardCheck, HandCoins, Route, TrendingUp, Warehouse, type LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useT } from "@/shared/i18n/I18nProvider";
import type { MsgKey } from "@/shared/i18n/messages";
import { fmtDate, fmtMoney } from "@/shared/lib/format";
import { useApi } from "@/shared/lib/useApi";
import { Card } from "@/shared/ui/Card";
import { ScrollScreen } from "@/shared/ui/Screen";
import { ErrorState, Loading } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";
import { colors, gradients } from "@/theme/tokens";
import type { InsightAgent, InsightsData, Severity } from "./types";

const ICONS: Record<InsightAgent["key"], LucideIcon> = { stock: Warehouse, finance: HandCoins, audit: ClipboardCheck, sales: TrendingUp, logistics: Route };

const SEV: Record<Severity, { label: MsgKey; signals: MsgKey; bar: string; text: string }> = {
  high: { label: "Muhim", signals: "Muhim signallar", bar: "#ef4444", text: "text-red-700" },
  medium: { label: "O'rta", signals: "O'rta signallar", bar: "#fbbf24", text: "text-amber-700" },
  low: { label: "Ma'lumot", signals: "Ma'lumot signallari", bar: "#38bdf8", text: "text-blue-700" },
};

/** Backend findings link to web paths (`/dashboard/...`); map them to app routes. */
export function mobileHref(href: string): string {
  const [path, query = ""] = href.replace(/^\/dashboard/, "").split("?");
  const status = new URLSearchParams(query).get("status");
  const low = new URLSearchParams(query).get("low");
  const detail = path.match(/^\/(orders|clients|audits)\/(\d+)$/);
  if (detail) return `/${detail[1]}/${detail[2]}`;
  const screen = path.replace(/^\//, "") || "home";
  if (screen === "home") return "/home";
  if (screen === "finance") return "/finance";
  return `/m/${screen}${status ? `?status=${status}` : low ? "?low=true" : ""}`;
}

export function InsightsScreen() {
  const t = useT();
  const { data, error, loading, reload } = useApi<InsightsData>("/insights");
  if (error && !data) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return <Loading full />;

  const all = data.agents.flatMap((a) => a.findings);
  const count = (s: Severity) => all.filter((f) => f.severity === s).length;

  return (
    <ScrollScreen refreshing={loading} onRefresh={reload}>
      <Txt className="text-sm text-ink-500">{t("Avtomatik tahlilchilar ombor, moliya, audit, sotuv va logistika ma'lumotlarini doimiy kuzatadi")}</Txt>
      <LinearGradient colors={gradients.promo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ borderRadius: 16, padding: 18 }}>
        <Txt className="text-sm text-brand-100">{t("Keyingi oy tushum prognozi")}</Txt>
        <Txt weight="extrabold" className="mt-1 text-2xl text-white">
          {fmtMoney(data.forecast_next_month)}
        </Txt>
        <Txt className="mt-1 text-xs text-brand-200">{t("Tahlil: {date}", { date: fmtDate(data.generated_at, true) })}</Txt>
      </LinearGradient>
      <View className="flex-row gap-3">
        {(["high", "medium", "low"] as Severity[]).map((s) => (
          <Card key={s} className="flex-1 p-3">
            <Txt className="text-[11px] text-ink-500" numberOfLines={2}>
              {t(SEV[s].signals)}
            </Txt>
            <Txt weight="extrabold" className="mt-1 text-xl">
              {count(s)}
            </Txt>
            <View className="mt-2 h-1 w-8 rounded-full" style={{ backgroundColor: SEV[s].bar }} />
          </Card>
        ))}
      </View>

      {data.agents.map((a) => {
        const Icon = ICONS[a.key] ?? Warehouse;
        return (
          <Card key={a.key} className="overflow-hidden">
            <View className="flex-row items-center gap-3 border-b border-ink-100 bg-brand-50/60 px-4 py-3">
              <View className="size-10 items-center justify-center rounded-icon bg-brand-600">
                <Icon size={20} color="#ffffff" />
              </View>
              <View className="flex-1">
                <Txt weight="bold">{a.name}</Txt>
                <Txt className="text-xs text-ink-500" numberOfLines={1}>
                  {a.role}
                </Txt>
              </View>
              <View className="rounded-full border border-ink-200 bg-white px-2.5 py-0.5">
                <Txt weight="bold" className="text-xs text-ink-700">
                  {a.findings.length}
                </Txt>
              </View>
            </View>
            {a.findings.length === 0 ? (
              <Txt className="px-4 py-6 text-center text-sm text-ink-500">✓ {t("Hammasi joyida — muammo topilmadi")}</Txt>
            ) : (
              a.findings.map((f, i) => (
                <Pressable key={i} onPress={() => router.push(mobileHref(f.href) as never)} className={`flex-row gap-3 px-4 py-3 active:bg-ink-50 ${i > 0 ? "border-t border-ink-100" : ""}`}>
                  <View className="mt-1 h-8 w-1 rounded-full" style={{ backgroundColor: SEV[f.severity].bar }} />
                  <View className="flex-1">
                    <View className="flex-row items-start gap-2">
                      <Txt weight="semibold" className="flex-1 text-sm">
                        {f.title}
                      </Txt>
                      <Txt weight="bold" className={`text-[10px] ${SEV[f.severity].text}`}>
                        {t(SEV[f.severity].label)}
                      </Txt>
                    </View>
                    <Txt className="mt-0.5 text-xs text-ink-500">{f.detail}</Txt>
                  </View>
                  <ChevronRight size={16} color={colors.ink[300]} />
                </Pressable>
              ))
            )}
          </Card>
        );
      })}
    </ScrollScreen>
  );
}
