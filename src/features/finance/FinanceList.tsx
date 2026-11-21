import { router } from "expo-router";
import { CalendarCheck, HandCoins, TriangleAlert, Wallet } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import type { Tone } from "@/shared/lib/status";
import { fmtCompact, fmtDate, fmtMoney } from "@/shared/lib/format";
import { can } from "@/shared/lib/roles";
import { useMe } from "@/shared/lib/session";
import { usePaged } from "@/shared/lib/usePaged";
import { Badge } from "@/shared/ui/Badge";
import { Card, KpiCard } from "@/shared/ui/Card";
import { Chips, SearchInput } from "@/shared/ui/Chips";
import { Fab, ItemWrap, ListView } from "@/shared/ui/ListView";
import { Txt } from "@/shared/ui/Txt";
import { METHODS, PaymentSheet } from "./PaymentForm";

interface Payment {
  id: number;
  client_id: number;
  client_name: string;
  order_number: string | null;
  amount: number;
  method: string;
  user_name: string | null;
  created_at: string;
}
interface Summary {
  summary: { month_total: number; today_total: number; receivables: number; overlimit: number };
}

const TONE: Record<string, Tone> = { cash: "green", card: "blue", transfer: "violet", payme: "blue", click: "blue" };

export function FinanceList() {
  const t = useT();
  const me = useMe();
  const list = usePaged<Payment, Summary>("/payments");
  const [open, setOpen] = useState(false);
  const s = list.first?.summary;

  return (
    <View className="flex-1">
      <ListView
        list={list}
        keyOf={(p) => p.id}
        emptyTitle={t("To'lov topilmadi")}
        header={
          <View className="gap-3">
            <View className="gap-3 px-4">
              <View className="flex-row gap-3">
                <KpiCard label={t("Bugun undirildi")} value={s ? fmtCompact(s.today_total) : "…"} icon={CalendarCheck} />
                <KpiCard label={t("Shu oy undirildi")} value={s ? fmtCompact(s.month_total) : "…"} icon={Wallet} tone="navy" />
              </View>
              <View className="flex-row gap-3">
                <KpiCard label={t("Umumiy debitorlik")} value={s ? fmtCompact(s.receivables) : "…"} icon={HandCoins} tone="amber" />
                <KpiCard label={t("Limitdan oshganlar")} value={s?.overlimit ?? "…"} icon={TriangleAlert} tone="red" hint={t("ro'yxat →")} onPress={() => router.push("/m/clients?status=overlimit")} />
              </View>
              <SearchInput value={list.q} onChange={list.setQ} placeholder={t("Mijoz bo'yicha…")} />
            </View>
            <Chips options={[{ value: "", label: t("Barchasi") }, ...Object.entries(METHODS).map(([value, label]) => ({ value, label: t(label) }))]} value={list.status} onChange={list.setStatus} />
          </View>
        }
        renderItem={(p) => (
          <ItemWrap>
            <Card className="flex-row items-center gap-3 p-4" onPress={() => router.push(`/clients/${p.client_id}`)}>
              <View className="flex-1">
                <Txt weight="bold" className="text-[15px]" numberOfLines={1}>
                  {p.client_name}
                </Txt>
                <Txt className="mt-0.5 text-xs text-ink-500" numberOfLines={1}>
                  {fmtDate(p.created_at, true)}
                  {p.order_number ? ` · ${p.order_number}` : ""}
                  {p.user_name ? ` · ${p.user_name}` : ""}
                </Txt>
              </View>
              <View className="items-end gap-1">
                <Txt weight="extrabold" className="text-[15px] text-brand-700">
                  +{fmtMoney(p.amount)}
                </Txt>
                <Badge tone={TONE[p.method] ?? "gray"}>{METHODS[p.method] ? t(METHODS[p.method]!) : p.method}</Badge>
              </View>
            </Card>
          </ItemWrap>
        )}
      />
      {can(me.role, "payment") && <Fab label={t("To'lov qabul qilish")} onPress={() => setOpen(true)} />}
      <PaymentSheet
        open={open}
        onClose={() => setOpen(false)}
        onDone={() => {
          setOpen(false);
          list.reload();
        }}
      />
    </View>
  );
}
