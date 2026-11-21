import { router } from "expo-router";
import { View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { fmtDate, fmtMoney } from "@/shared/lib/format";
import { can } from "@/shared/lib/roles";
import { useMe } from "@/shared/lib/session";
import { usePaged } from "@/shared/lib/usePaged";
import { Card, Progress } from "@/shared/ui/Card";
import { Chips, SearchInput } from "@/shared/ui/Chips";
import { Fab, ItemWrap, ListView } from "@/shared/ui/ListView";
import { Txt } from "@/shared/ui/Txt";

interface Client {
  id: number;
  name: string;
  owner_name: string | null;
  phone: string | null;
  region: string;
  segment: string;
  agent_name: string | null;
  credit_limit: number;
  balance: number;
  last_order_at: string | null;
}

export const SEGMENT: Record<string, { box: string; text: string }> = {
  A: { box: "bg-brand-600", text: "text-white" },
  B: { box: "bg-brand-100", text: "text-brand-800" },
  C: { box: "bg-ink-100", text: "text-ink-600" },
};

export function ClientsList({ initialStatus = "" }: { initialStatus?: string }) {
  const t = useT();
  const me = useMe();
  const list = usePaged<Client>("/clients", initialStatus);

  return (
    <View className="flex-1">
      <ListView
        list={list}
        keyOf={(c) => c.id}
        emptyTitle={t("Mijoz topilmadi")}
        header={
          <View className="gap-3">
            <View className="px-4">
              <SearchInput value={list.q} onChange={list.setQ} placeholder={t("Nomi, telefon, hudud…")} />
            </View>
            <Chips
              options={[
                { value: "", label: t("Barchasi") },
                { value: "debt", label: t("Qarzdorlar") },
                { value: "overlimit", label: t("Limitdan oshgan") },
                { value: "A", label: t("A segment") },
                { value: "B", label: "B" },
                { value: "C", label: "C" },
              ]}
              value={list.status}
              onChange={list.setStatus}
            />
          </View>
        }
        renderItem={(c) => {
          const usage = c.credit_limit ? (c.balance / c.credit_limit) * 100 : 0;
          const seg = SEGMENT[c.segment] ?? SEGMENT.C!;
          return (
            <ItemWrap>
              <Card className="p-4" onPress={() => router.push(`/clients/${c.id}`)}>
                <View className="flex-row items-start gap-3">
                  <View className={`size-9 items-center justify-center rounded-icon ${seg.box}`}>
                    <Txt weight="extrabold" className={`text-sm ${seg.text}`}>
                      {c.segment}
                    </Txt>
                  </View>
                  <View className="flex-1">
                    <Txt weight="bold" className="text-[15px]" numberOfLines={1}>
                      {c.name}
                    </Txt>
                    <Txt className="text-xs text-ink-500" numberOfLines={1}>
                      {[c.owner_name, c.phone, c.region].filter(Boolean).join(" · ")}
                    </Txt>
                  </View>
                </View>
                <View className="mt-3 flex-row justify-between">
                  <Txt weight="bold" className={`text-sm ${usage > 100 ? "text-red-600" : "text-ink-900"}`}>
                    {fmtMoney(c.balance)}
                  </Txt>
                  <Txt className="text-xs text-ink-400">{c.credit_limit ? `${usage.toFixed(0)}%` : "∞"}</Txt>
                </View>
                <View className="mt-1.5">
                  <Progress pct={usage} />
                </View>
                <Txt className="mt-2 text-[11px] text-ink-500">
                  {t("Agent")}: {c.agent_name ?? "—"} · {t("Oxirgi buyurtma")}: {fmtDate(c.last_order_at)}
                </Txt>
              </Card>
            </ItemWrap>
          );
        }}
      />
      {can(me.role, "clientCreate") && <Fab label={t("Mijoz qo'shish")} onPress={() => router.push("/clients/new")} />}
    </View>
  );
}
