import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { api, errorText } from "@/shared/lib/api";
import { fmtDate, fmtMoney } from "@/shared/lib/format";
import { can } from "@/shared/lib/roles";
import { useMe } from "@/shared/lib/session";
import { clearApiCache, useApi } from "@/shared/lib/useApi";
import { usePaged } from "@/shared/lib/usePaged";
import { StatusBadge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, Progress } from "@/shared/ui/Card";
import { Chips, SearchInput } from "@/shared/ui/Chips";
import { Field, Input, Select } from "@/shared/ui/Field";
import { Fab, ItemWrap, ListView } from "@/shared/ui/ListView";
import { WarehouseSelect, type WarehouseOption } from "@/shared/ui/SearchSelect";
import { Sheet } from "@/shared/ui/Sheet";
import { Alert } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";

export interface AuditSummary {
  id: number;
  number: string;
  status: string;
  note: string | null;
  created_at: string;
  completed_at: string | null;
  approved_at: string | null;
  warehouse_name: string;
  city: string;
  auditor_name: string | null;
  items_count: number;
  counted_count: number;
  mismatch_count: number;
  variance_value: number;
}

export function AuditsList({ initialStatus = "" }: { initialStatus?: string }) {
  const t = useT();
  const me = useMe();
  const list = usePaged<AuditSummary>("/audits", initialStatus);
  const [open, setOpen] = useState(false);

  return (
    <View className="flex-1">
      <ListView
        list={list}
        keyOf={(a) => a.id}
        emptyTitle={t("Audit topilmadi")}
        header={
          <View className="gap-3">
            <View className="px-4">
              <SearchInput value={list.q} onChange={list.setQ} placeholder={t("Raqam yoki ombor…")} />
            </View>
            <Chips
              options={[
                { value: "", label: t("Barchasi") },
                { value: "in_progress", label: t("Tekshirilmoqda") },
                { value: "completed", label: t("Tasdiq kutmoqda") },
                { value: "approved", label: t("Tasdiqlandi") },
              ]}
              value={list.status}
              onChange={list.setStatus}
            />
          </View>
        }
        renderItem={(a) => {
          const pct = a.items_count ? (a.counted_count / a.items_count) * 100 : 0;
          return (
            <ItemWrap>
              <Card className="p-4" onPress={() => router.push(`/audits/${a.id}`)}>
                <View className="flex-row items-start gap-3">
                  <View className="flex-1">
                    <Txt weight="bold" className="text-[15px]" numberOfLines={1}>
                      {a.warehouse_name}
                    </Txt>
                    <Txt className="text-xs text-ink-500">
                      {a.number} · {a.city} · {fmtDate(a.created_at)}
                    </Txt>
                  </View>
                  <StatusBadge status={a.status} />
                </View>
                <View className="mt-3 flex-row items-center gap-2">
                  <View className="flex-1">
                    <Progress pct={pct} tone="brand" />
                  </View>
                  <Txt className="text-xs text-ink-500">
                    {a.counted_count}/{a.items_count}
                  </Txt>
                </View>
                <View className="mt-2 flex-row justify-between">
                  <Txt className="mr-2 flex-1 text-xs text-ink-500" numberOfLines={1}>
                    {t("Auditor:")} {a.auditor_name ?? "—"}
                  </Txt>
                  <Txt weight="semibold" className={`text-xs ${a.variance_value < 0 ? "text-red-600" : a.variance_value > 0 ? "text-brand-700" : "text-ink-400"}`}>
                    {a.mismatch_count ? `${t("Farqlar")}: ${a.mismatch_count} · ` : ""}
                    {a.variance_value ? fmtMoney(a.variance_value) : "—"}
                  </Txt>
                </View>
              </Card>
            </ItemWrap>
          );
        }}
      />
      {can(me.role, "auditRun") && <Fab label={t("Audit boshlash")} onPress={() => setOpen(true)} />}
      {open && <NewAuditSheet onClose={() => setOpen(false)} />}
    </View>
  );
}

function NewAuditSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [warehouse, setWarehouse] = useState<WarehouseOption | null>(null);
  const auditors = useApi<{ items: { id: number; full_name: string }[] }>("/users?role=auditor&status=active");
  const [auditor, setAuditor] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!warehouse) return setError(t("Ro'yxatdan tanlang"));
    setSaving(true);
    setError(undefined);
    try {
      const a = await api<{ id: number }>("/audits", { method: "POST", json: { warehouse_id: warehouse.id, auditor_id: auditor ? Number(auditor) : null, note: note.trim() || undefined } });
      clearApiCache();
      onClose();
      router.push(`/audits/${a.id}`);
    } catch (e) {
      setError(errorText(e));
      setSaving(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={t("Yangi audit")} description={t("Ombordagi joriy qoldiq auditga “kutilgan” miqdor sifatida yoziladi")}>
      <Field label={t("Ombor")}>
        <WarehouseSelect title={t("Ombor")} params={{ active: "true" }} value={warehouse} onChange={setWarehouse} />
      </Field>
      <Field label={t("Auditor")}>
        <Select title={t("Auditor")} value={auditor} onChange={setAuditor} options={[{ value: "", label: t("Men o'zim") }, ...(auditors.data?.items.map((u) => ({ value: String(u.id), label: u.full_name })) ?? [])]} />
      </Field>
      <Field label={t("Izoh")}>
        <Input value={note} onChangeText={setNote} multiline placeholder={t("Rejali / kutilmagan tekshiruv, sabab…")} />
      </Field>
      {error && <Alert>{error}</Alert>}
      <Button loading={saving} onPress={submit}>
        {t("Auditni boshlash")}
      </Button>
    </Sheet>
  );
}
