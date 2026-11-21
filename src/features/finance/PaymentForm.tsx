import { useState } from "react";
import { useT } from "@/shared/i18n/I18nProvider";
import type { MsgKey } from "@/shared/i18n/messages";
import { api, errorText } from "@/shared/lib/api";
import { currency, fmtMoney } from "@/shared/lib/format";
import { clearApiCache } from "@/shared/lib/useApi";
import { Button } from "@/shared/ui/Button";
import { Field, Input, Select, toNum } from "@/shared/ui/Field";
import { SearchSelect } from "@/shared/ui/SearchSelect";
import { Sheet } from "@/shared/ui/Sheet";
import { Alert } from "@/shared/ui/States";

const MANUAL: Record<"cash" | "card" | "transfer", MsgKey> = { cash: "Naqd", card: "Karta", transfer: "Bank o'tkazmasi" };
/** Payme and Click arrive only via provider callbacks, never from the manual form. */
export const METHODS: Record<string, MsgKey> = { ...MANUAL, payme: "Payme", click: "Click" };

interface ClientOpt {
  id: number;
  name: string;
  balance: number;
}

export function PaymentSheet({ open, onClose, onDone, client: fixed }: { open: boolean; onClose: () => void; onDone: () => void; client?: { id: number; name: string; balance: number } }) {
  const t = useT();
  const [client, setClient] = useState<ClientOpt | null>(null);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<keyof typeof MANUAL>("cash");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const target = fixed ?? client;

  async function submit() {
    setError(undefined);
    if (!target) return setError(t("Ro'yxatdan tanlang"));
    setSaving(true);
    try {
      await api("/payments", { method: "POST", json: { client_id: target.id, amount: toNum(amount), method, note: note.trim() || undefined } });
      clearApiCache();
      setAmount("");
      setNote("");
      setClient(null);
      onDone();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("To'lov qabul qilish")} description={fixed ? t("{name} — joriy qarz {sum}", { name: fixed.name, sum: fmtMoney(fixed.balance) }) : undefined}>
      {!fixed && (
        <Field label={t("Mijoz")}>
          <SearchSelect<ClientOpt>
            path="/clients"
            params={{ status: "debt" }}
            title={t("Mijoz")}
            value={client}
            onChange={setClient}
            display={(c) => c.name}
            hint={(c) => t("Qarz {sum}", { sum: fmtMoney(c.balance) })}
          />
        </Field>
      )}
      <Field label={t("Summa, {cur}", { cur: currency() })}>
        <Input value={amount} onChangeText={setAmount} keyboardType="number-pad" testID="pay-amount" />
      </Field>
      <Field label={t("To'lov turi")}>
        <Select title={t("To'lov turi")} value={method} onChange={setMethod} options={Object.entries(MANUAL).map(([value, label]) => ({ value: value as keyof typeof MANUAL, label: t(label) }))} />
      </Field>
      <Field label={t("Izoh")}>
        <Input value={note} onChangeText={setNote} multiline />
      </Field>
      {error && <Alert>{error}</Alert>}
      <Button loading={saving} disabled={!toNum(amount)} onPress={submit} testID="pay-submit">
        {t("To'lovni qabul qilish")}
      </Button>
    </Sheet>
  );
}
