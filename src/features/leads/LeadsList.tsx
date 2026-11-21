import { Phone } from "lucide-react-native";
import { useState } from "react";
import { Linking, View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import type { MsgKey } from "@/shared/i18n/messages";
import { trData } from "@/shared/i18n/translate";
import { api, errorText } from "@/shared/lib/api";
import { fmtDate } from "@/shared/lib/format";
import { clearApiCache } from "@/shared/lib/useApi";
import { usePaged } from "@/shared/lib/usePaged";
import { StatusBadge } from "@/shared/ui/Badge";
import { Card, InfoRow } from "@/shared/ui/Card";
import { Chips } from "@/shared/ui/Chips";
import { Select } from "@/shared/ui/Field";
import { ItemWrap, ListView } from "@/shared/ui/ListView";
import { Alert } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";

interface Lead {
  id: number;
  name: string;
  phone: string;
  company: string | null;
  message: string | null;
  status: string;
  created_at: string;
}

const STATUSES: { value: string; label: MsgKey }[] = [
  { value: "new", label: "Yangi" },
  { value: "contacted", label: "Bog'lanildi" },
  { value: "won", label: "Mijozga aylandi" },
  { value: "lost", label: "Yo'qotildi" },
];

export function LeadsList() {
  const t = useT();
  const list = usePaged<Lead>("/leads");
  const [error, setError] = useState<string>();

  async function setStatus(id: number, status: string) {
    setError(undefined);
    try {
      await api(`/leads/${id}`, { method: "PATCH", json: { status } });
      clearApiCache();
      list.reload();
    } catch (e) {
      setError(errorText(e));
    }
  }

  return (
    <ListView
      list={list}
      keyOf={(l) => l.id}
      emptyTitle={t("Lid yo'q")}
      emptyHint={t("Landing sahifadagi forma to'ldirilganda shu yerda paydo bo'ladi")}
      header={
        <View className="gap-3">
          <Txt className="px-4 text-sm text-ink-500">{t("Saytdagi “Demoga yozilish” formasi orqali kelgan so'rovlar")}</Txt>
          <Chips options={[{ value: "", label: t("Barchasi") }, ...STATUSES.map((s) => ({ value: s.value, label: t(s.label) }))]} value={list.status} onChange={list.setStatus} />
          {error && (
            <View className="px-4">
              <Alert>{error}</Alert>
            </View>
          )}
        </View>
      }
      renderItem={(l) => (
        <ItemWrap>
          <Card className="p-4">
            <View className="flex-row items-start gap-3">
              <View className="flex-1">
                <Txt weight="bold" className="text-[15px]">
                  {trData(l.name)}
                </Txt>
                <Txt className="text-xs text-ink-500">
                  {l.company ?? "—"} · {fmtDate(l.created_at, true)}
                </Txt>
              </View>
              <StatusBadge status={l.status} />
            </View>
            <InfoRow icon={Phone} value={l.phone} onPress={() => Linking.openURL(`tel:${l.phone.replace(/\s/g, "")}`)} />
            {l.message ? <Txt className="mb-2 text-sm text-ink-600">{trData(l.message)}</Txt> : null}
            <Select title={t("O'zgartirish")} value={l.status} onChange={(v) => setStatus(l.id, v)} options={STATUSES.map((s) => ({ value: s.value, label: t(s.label) }))} />
          </Card>
        </ItemWrap>
      )}
    />
  );
}
