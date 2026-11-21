import { router } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { api, errorText } from "@/shared/lib/api";
import { currency } from "@/shared/lib/format";
import { clearApiCache, useApi } from "@/shared/lib/useApi";
import { Button } from "@/shared/ui/Button";
import { Card } from "@/shared/ui/Card";
import { Field, Input, Select, toNum } from "@/shared/ui/Field";
import { ScrollScreen } from "@/shared/ui/Screen";
import { Alert, Loading } from "@/shared/ui/States";

interface ClientIn {
  id?: number;
  inn?: string | null;
  name?: string;
  owner_name?: string | null;
  phone?: string | null;
  region?: string;
  address?: string | null;
  segment?: string;
  credit_limit?: number;
  agent_id?: number | null;
}

/** New client, or edit when `id` is given (manager only on the server). */
export function ClientForm({ id }: { id?: string }) {
  const existing = useApi<ClientIn>(id ? `/clients/${id}` : null);
  if (id && !existing.data) return <Loading full />;
  return <Form initial={existing.data ?? { segment: "B", credit_limit: 20_000_000 }} />;
}

function Form({ initial }: { initial: ClientIn }) {
  const t = useT();
  const agents = useApi<{ items: { id: number; full_name: string; region: string | null }[] }>("/users?role=agent&status=active");
  const [f, setF] = useState({
    inn: initial.inn ?? "",
    name: initial.name ?? "",
    owner_name: initial.owner_name ?? "",
    phone: initial.phone ?? "",
    region: initial.region ?? "",
    address: initial.address ?? "",
    segment: initial.segment ?? "B",
    credit_limit: String(initial.credit_limit ?? 0),
    agent_id: initial.agent_id ? String(initial.agent_id) : "",
  });
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [looking, setLooking] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((s) => ({ ...s, [k]: v }));

  async function lookup() {
    setLooking(true);
    setError(undefined);
    try {
      const r = await api<{ name: string | null; director: string | null; address: string | null }>(`/clients/lookup/${f.inn.trim()}`);
      setF((s) => ({ ...s, name: r.name ?? s.name, owner_name: s.owner_name || r.director || "", address: s.address || r.address || "" }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLooking(false);
    }
  }

  async function submit() {
    setSaving(true);
    setError(undefined);
    try {
      const body = { ...f, credit_limit: toNum(f.credit_limit) ?? 0, agent_id: f.agent_id ? Number(f.agent_id) : null };
      const r = await api<{ id: number }>(initial.id ? `/clients/${initial.id}` : "/clients", { method: initial.id ? "PUT" : "POST", json: body });
      clearApiCache();
      router.replace(`/clients/${initial.id ?? r.id}`);
    } catch (e) {
      setError(errorText(e));
      setSaving(false);
    }
  }

  return (
    <ScrollScreen>
      <Card className="gap-4 p-4">
        <Field label={t("INN (STIR)")}>
          <View className="flex-row gap-2">
            <Input value={f.inn} onChangeText={set("inn")} keyboardType="number-pad" placeholder={t("9 yoki 14 ta raqam")} className="flex-1" maxLength={14} />
            <Button variant="secondary" size="sm" className="min-h-12" loading={looking} disabled={!/^\d{9}$|^\d{14}$/.test(f.inn.trim())} onPress={lookup}>
              {t("Soliqdan to'ldirish")}
            </Button>
          </View>
        </Field>
        <Field label={t("Savdo nuqtasi nomi")}>
          <Input value={f.name} onChangeText={set("name")} />
        </Field>
        <Field label={t("Egasi")}>
          <Input value={f.owner_name} onChangeText={set("owner_name")} />
        </Field>
        <Field label={t("Telefon")}>
          <Input value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" placeholder="+998 …" />
        </Field>
        <Field label={t("Hudud")}>
          <Input value={f.region} onChangeText={set("region")} placeholder={t("Toshkent")} />
        </Field>
        <Field label={t("Manzil")}>
          <Input value={f.address} onChangeText={set("address")} />
        </Field>
        <Field label={t("Segment")}>
          <Select
            title={t("Segment")}
            value={f.segment}
            onChange={set("segment")}
            options={[
              { value: "A", label: t("A — yirik") },
              { value: "B", label: t("B — o'rta") },
              { value: "C", label: t("C — kichik") },
            ]}
          />
        </Field>
        <Field label={t("Kredit limiti, {cur}", { cur: currency() })}>
          <Input value={f.credit_limit} onChangeText={set("credit_limit")} keyboardType="number-pad" />
        </Field>
        <Field label={t("Savdo agenti")}>
          <Select
            title={t("Savdo agenti")}
            value={f.agent_id}
            onChange={set("agent_id")}
            options={[{ value: "", label: t("Biriktirilmagan") }, ...(agents.data?.items.map((a) => ({ value: String(a.id), label: a.full_name, hint: a.region ?? undefined })) ?? [])]}
          />
        </Field>
      </Card>
      {error && <Alert>{error}</Alert>}
      <Button loading={saving} onPress={submit}>
        {t("Saqlash")}
      </Button>
    </ScrollScreen>
  );
}
