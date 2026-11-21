import { Stack } from "expo-router";
import { BadgeCheck, Boxes, ClipboardCheck, HandCoins, Save, TriangleAlert } from "lucide-react-native";
import { useState } from "react";
import { Alert as RNAlert, FlatList, TextInput, View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { trData } from "@/shared/i18n/translate";
import { api, errorText } from "@/shared/lib/api";
import { fmtDate, fmtMoney, fmtNum } from "@/shared/lib/format";
import { can } from "@/shared/lib/roles";
import { useMe } from "@/shared/lib/session";
import { clearApiCache, useApi } from "@/shared/lib/useApi";
import { StatusBadge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, KpiCard } from "@/shared/ui/Card";
import { SearchInput } from "@/shared/ui/Chips";
import { Alert, ErrorState, Loading } from "@/shared/ui/States";
import { Txt, useFontFamily } from "@/shared/ui/Txt";
import { colors } from "@/theme/tokens";
import type { AuditSummary } from "./AuditsList";

type Item = { id: number; product_id: number; product_name: string; sku: string; unit: string; cost: number; expected: number; counted: number | null };
interface AuditFull extends AuditSummary {
  items: Item[];
}

export function AuditDetail({ id }: { id: string }) {
  const t = useT();
  const me = useMe();
  const font = useFontFamily("semibold");
  const { data: a, error, loading, reload } = useApi<AuditFull>(`/audits/${id}`);
  // Local edits belong to one server snapshot; a fresh response (after save/approve) resets them.
  const [edits, setEdits] = useState<{ src?: AuditFull; counts: Record<number, string> }>({ counts: {} });
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const counts: Record<number, string> = a && edits.src === a ? edits.counts : Object.fromEntries((a?.items ?? []).map((i) => [i.product_id, i.counted === null ? "" : String(i.counted)]));
  const setCounts = (fn: (c: Record<number, string>) => Record<number, string>) => setEdits({ src: a, counts: fn(counts) });

  if (error && !a) return <ErrorState message={error} onRetry={reload} />;
  if (!a) return <Loading full />;

  const editable = a.status === "in_progress" && can(me.role, "auditRun");
  const ql = q.toLowerCase();
  const rows = a.items.filter((i) => !q || i.product_name.toLowerCase().includes(ql) || i.sku.toLowerCase().includes(ql));
  const diffOf = (i: Item) => (counts[i.product_id] === "" || counts[i.product_id] === undefined ? null : Number(counts[i.product_id]) - i.expected);
  const variance = a.items.reduce((s, i) => s + (diffOf(i) ?? 0) * i.cost, 0);
  const mismatches = a.items.filter((i) => (diffOf(i) ?? 0) !== 0).length;
  const counted = a.items.filter((i) => diffOf(i) !== null).length;

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    setMsg(undefined);
    try {
      await fn();
      clearApiCache();
      setMsg({ ok: true, text: ok });
      reload();
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    api(`/audits/${id}/items`, {
      method: "PUT",
      json: { items: Object.entries(counts).map(([product_id, v]) => ({ product_id: Number(product_id), counted: v === "" ? null : Number(v) })) },
    });

  const approve = () =>
    RNAlert.alert(t("Tasdiqlash"), t("Tasdiqlansa, ombor qoldig'i sanoq natijasiga tenglashtiriladi. Davom etasizmi?"), [
      { text: t("Yo'q"), style: "cancel" },
      { text: t("Tasdiqlash"), onPress: () => run(() => api(`/audits/${id}/approve`, { method: "POST" }), t("Audit tasdiqlandi, qoldiqlar tuzatildi")) },
    ]);

  const header = (
    <View className="gap-4 px-4 pb-3 pt-2">
      <Card className="p-4">
        <View className="flex-row items-center justify-between">
          <Txt weight="bold" className="text-base">
            {a.warehouse_name}
          </Txt>
          <StatusBadge status={a.status} />
        </View>
        <Txt className="mt-1 text-xs text-ink-500">
          {a.city} · {t("Auditor:")} {a.auditor_name ?? "—"} · {t("Boshlangan:")} {fmtDate(a.created_at, true)}
          {a.approved_at ? ` · ${t("Tasdiqlangan:")} ${fmtDate(a.approved_at, true)}` : ""}
        </Txt>
        {a.note ? <Txt className="mt-1 text-xs text-ink-600">{trData(a.note)}</Txt> : null}
      </Card>
      {msg && <Alert ok={msg.ok}>{msg.text}</Alert>}
      <View className="flex-row gap-3">
        <KpiCard label={t("Sanalgan")} value={`${counted} / ${a.items.length}`} icon={Boxes} hint={t("pozitsiya")} />
        <KpiCard label={t("Farqli pozitsiya")} value={mismatches} icon={TriangleAlert} tone={mismatches ? "amber" : "brand"} />
      </View>
      <KpiCard label={t("Farq summasi")} value={fmtMoney(variance)} icon={HandCoins} tone={variance < 0 ? "red" : "brand"} hint={t("tannarx bo'yicha")} />
      {editable && (
        <View className="gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={busy}
            onPress={() => setCounts(() => Object.fromEntries(a.items.map((i) => [i.product_id, counts[i.product_id] || String(i.expected)])))}
          >
            {t("Bo'shlarni kutilgan bilan to'ldirish")}
          </Button>
          <View className="flex-row gap-2">
            <Button variant="secondary" icon={Save} className="flex-1" disabled={busy} onPress={() => run(save, t("Sanoq saqlandi"))}>
              {t("Saqlash")}
            </Button>
            <Button
              icon={ClipboardCheck}
              className="flex-1"
              loading={busy}
              onPress={() =>
                run(async () => {
                  await save();
                  await api(`/audits/${id}/complete`, { method: "POST" });
                }, t("Audit yakunlandi va tasdiqqa yuborildi"))
              }
            >
              {t("Yakunlash")}
            </Button>
          </View>
        </View>
      )}
      {a.status === "completed" && can(me.role, "auditApprove") && (
        <Button icon={BadgeCheck} loading={busy} onPress={approve}>
          {t("Tasdiqlash")}
        </Button>
      )}
      <Txt weight="bold" className="mt-2 text-base">
        {t("Sanoq varag'i")}
      </Txt>
      <SearchInput value={q} onChange={setQ} placeholder={t("Tovar qidiring…")} />
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: a.number }} />
      <FlatList
        data={rows}
        keyExtractor={(i) => String(i.id)}
        ListHeaderComponent={header}
        keyboardShouldPersistTaps="handled"
        refreshing={loading}
        onRefresh={reload}
        contentContainerClassName="pb-16"
        renderItem={({ item: i }) => {
          const d = diffOf(i);
          return (
            <View className={`mx-4 mb-2 flex-row items-center gap-3 rounded-input border px-3 py-2.5 ${d ? (d < 0 ? "border-red-200 bg-red-50" : "border-brand-200 bg-brand-50") : "border-ink-100 bg-white"}`}>
              <View className="flex-1">
                <Txt weight="semibold" className="text-sm" numberOfLines={2}>
                  {i.product_name}
                </Txt>
                <Txt className="text-[11px] text-ink-500">
                  {i.sku} · {t("Kutilgan")}: {fmtNum(i.expected)} {trData(i.unit)}
                </Txt>
                {d ? (
                  <Txt weight="bold" className={`text-[11px] ${d < 0 ? "text-red-600" : "text-brand-700"}`}>
                    {d > 0 ? `+${d}` : d} · {fmtMoney(d * i.cost)}
                  </Txt>
                ) : null}
              </View>
              {editable ? (
                <TextInput
                  value={counts[i.product_id] ?? ""}
                  onChangeText={(v) => setCounts((c) => ({ ...c, [i.product_id]: v.replace(/[^\d]/g, "") }))}
                  keyboardType="number-pad"
                  placeholder="—"
                  placeholderTextColor={colors.ink[300]}
                  accessibilityLabel={t("{name} sanog'i", { name: i.product_name })}
                  className="h-11 w-20 rounded-input border border-ink-200 bg-white text-center text-base text-ink-900"
                  style={{ fontFamily: font }}
                />
              ) : (
                <Txt weight="bold" className="w-16 text-right text-base">
                  {i.counted ?? "—"}
                </Txt>
              )}
            </View>
          );
        }}
      />
    </>
  );
}
