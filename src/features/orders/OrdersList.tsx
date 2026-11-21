import { router } from "expo-router";
import { View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { fmtDate, fmtMoney } from "@/shared/lib/format";
import { can } from "@/shared/lib/roles";
import { useMe } from "@/shared/lib/session";
import { usePaged } from "@/shared/lib/usePaged";
import { StatusBadge } from "@/shared/ui/Badge";
import { Card } from "@/shared/ui/Card";
import { Chips, SearchInput } from "@/shared/ui/Chips";
import { Fab, ItemWrap, ListView } from "@/shared/ui/ListView";
import { Txt } from "@/shared/ui/Txt";

export interface OrderRow {
  id: number;
  number: string;
  status: string;
  total: number;
  discount_pct: number;
  created_at: string;
  client_name: string;
  region: string;
  agent_name: string | null;
  warehouse_name: string;
  items_count: number;
}

export function OrdersList({ initialStatus = "" }: { initialStatus?: string }) {
  const t = useT();
  const me = useMe();
  const list = usePaged<OrderRow>("/orders", initialStatus);

  return (
    <View className="flex-1">
      <ListView
        list={list}
        keyOf={(o) => o.id}
        emptyTitle={t("Buyurtma topilmadi")}
        emptyHint={t("Filtrni o'zgartiring yoki yangi buyurtma yarating")}
        header={
          <View className="gap-3">
            <View className="px-4">
              <SearchInput value={list.q} onChange={list.setQ} placeholder={t("Raqam yoki mijoz…")} />
            </View>
            <Chips
              options={[
                { value: "", label: t("Barchasi") },
                { value: "new", label: t("Yangi") },
                { value: "confirmed", label: t("Tasdiqlangan") },
                { value: "shipped", label: t("Yuklangan") },
                { value: "delivered", label: t("Yetkazildi") },
                { value: "cancelled", label: t("Bekor") },
              ]}
              value={list.status}
              onChange={list.setStatus}
            />
          </View>
        }
        renderItem={(o) => (
          <ItemWrap>
            <Card className="p-4" onPress={() => router.push(`/orders/${o.id}`)} testID={`order-${o.id}`}>
              <View className="flex-row items-start gap-3">
                <View className="flex-1">
                  <Txt weight="bold" className="text-[15px]" numberOfLines={1}>
                    {o.client_name}
                  </Txt>
                  <Txt className="mt-0.5 text-xs text-ink-500">
                    {o.number} · {o.region} · {fmtDate(o.created_at)}
                  </Txt>
                </View>
                <StatusBadge status={o.status} />
              </View>
              <View className="mt-3 flex-row items-end justify-between">
                <Txt className="mr-3 flex-1 text-xs text-ink-500" numberOfLines={1}>
                  {o.warehouse_name} · {t("Pozitsiya")}: {o.items_count}
                  {o.agent_name ? ` · ${o.agent_name}` : ""}
                </Txt>
                <Txt weight="extrabold" className="text-base">
                  {fmtMoney(o.total)}
                </Txt>
              </View>
            </Card>
          </ItemWrap>
        )}
      />
      {can(me.role, "orderCreate") && <Fab label={t("Yangi buyurtma")} onPress={() => router.push("/orders/new")} />}
    </View>
  );
}
