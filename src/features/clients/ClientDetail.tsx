import { router, Stack } from "expo-router";
import { FileText, HandCoins, Link2, MapPin, Pencil, Phone, UserRound } from "lucide-react-native";
import { useState } from "react";
import { Linking, View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { fmtDate, fmtMoney } from "@/shared/lib/format";
import { can } from "@/shared/lib/roles";
import { useMe } from "@/shared/lib/session";
import { useApi } from "@/shared/lib/useApi";
import { Button, IconButton } from "@/shared/ui/Button";
import { Card, Divider, InfoRow, Progress, SectionTitle } from "@/shared/ui/Card";
import { ScrollScreen } from "@/shared/ui/Screen";
import { Empty, ErrorState, Loading } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";
import { METHODS, PaymentSheet } from "../finance/PaymentForm";
import { PaymentLinksSheet } from "./PaymentLinks";

interface ClientFull {
  id: number;
  name: string;
  owner_name: string | null;
  phone: string | null;
  region: string;
  address: string | null;
  inn: string | null;
  segment: string;
  agent_name: string | null;
  credit_limit: number;
  balance: number;
  ledger: { kind: "order" | "payment"; ref: string; debit: number; credit: number; at: string }[];
}

export function ClientDetail({ id }: { id: string }) {
  const t = useT();
  const me = useMe();
  const { data: c, error, loading, reload } = useApi<ClientFull>(`/clients/${id}`);
  const [pay, setPay] = useState(false);
  const [link, setLink] = useState(false);

  if (error && !c) return <ErrorState message={error} onRetry={reload} />;
  if (!c) return <Loading full />;

  const debit = c.ledger.reduce((s, l) => s + Number(l.debit), 0);
  const credit = c.ledger.reduce((s, l) => s + Number(l.credit), 0);
  const usage = c.credit_limit ? (c.balance / c.credit_limit) * 100 : 0;
  const canPay = can(me.role, "payment");

  return (
    <>
      <Stack.Screen
        options={{
          title: c.name,
          headerRight: can(me.role, "clientEdit") ? () => <IconButton icon={Pencil} label={t("Tahrirlash")} onPress={() => router.push(`/clients/new?id=${c.id}`)} /> : undefined,
        }}
      />
      <ScrollScreen refreshing={loading} onRefresh={reload}>
        <Card className="p-4">
          <Txt className="text-sm text-ink-500">{t("Joriy qarz")}</Txt>
          <Txt weight="extrabold" className={`mt-1 text-2xl ${c.credit_limit && c.balance > c.credit_limit ? "text-red-600" : "text-ink-900"}`}>
            {fmtMoney(c.balance)}
          </Txt>
          <View className="mt-3 flex-row justify-between">
            <Txt className="text-xs text-ink-500">
              {t("Kredit limiti")}: {c.credit_limit ? fmtMoney(c.credit_limit) : t("Cheksiz")}
            </Txt>
            <Txt weight="bold" className="text-xs">
              {c.credit_limit ? `${usage.toFixed(0)}%` : "—"}
            </Txt>
          </View>
          <View className="mt-1.5">
            <Progress pct={usage} />
          </View>
        </Card>

        {canPay && (
          <View className="flex-row gap-2">
            <Button icon={HandCoins} className="flex-1" onPress={() => setPay(true)} testID="client-pay">
              {t("To'lov")}
            </Button>
            <Button icon={Link2} variant="secondary" className="flex-1" onPress={() => setLink(true)}>
              Payme / Click
            </Button>
          </View>
        )}

        <Card className="px-4 py-2">
          <InfoRow icon={UserRound} value={c.owner_name ?? "—"} />
          <InfoRow icon={Phone} value={c.phone ?? "—"} onPress={c.phone ? () => Linking.openURL(`tel:${c.phone!.replace(/\s/g, "")}`) : undefined} />
          <InfoRow icon={MapPin} value={c.address ?? c.region} />
          <InfoRow icon={FileText} value={`INN: ${c.inn ?? "—"}`} />
          <Divider />
          <InfoRow label={t("Segment")} value={t("{s} segment", { s: c.segment })} />
          <InfoRow label={t("Agent")} value={c.agent_name ?? "—"} />
        </Card>

        <Card className="p-4">
          <SectionTitle hint={`${t("Yuklangan:")} ${fmtMoney(debit)} · ${t("To'langan:")} ${fmtMoney(credit)}`}>{t("Akt sverka (o'zaro hisob-kitob)")}</SectionTitle>
          {c.ledger.length === 0 ? (
            <Empty title={t("Operatsiyalar yo'q")} />
          ) : (
            c.ledger.map((l, i) => (
              <View key={i}>
                {i > 0 && <Divider />}
                <View className="flex-row items-center gap-3 py-2.5">
                  <View className="flex-1">
                    <Txt weight="semibold" className="text-sm">
                      {l.kind === "order" ? t("Yuklab berildi") : t("To'lov")}
                    </Txt>
                    <Txt className="text-[11px] text-ink-500">
                      {fmtDate(l.at, true)} · {l.kind === "payment" ? (METHODS[l.ref] ? t(METHODS[l.ref]!) : l.ref) : l.ref}
                    </Txt>
                  </View>
                  <Txt weight="bold" className={`text-sm ${l.credit ? "text-brand-700" : "text-ink-900"}`}>
                    {l.credit ? `+${fmtMoney(l.credit)}` : fmtMoney(l.debit)}
                  </Txt>
                </View>
              </View>
            ))
          )}
        </Card>
      </ScrollScreen>
      <PaymentSheet
        open={pay}
        onClose={() => setPay(false)}
        client={c}
        onDone={() => {
          setPay(false);
          reload();
        }}
      />
      {link && <PaymentLinksSheet open onClose={() => setLink(false)} clientId={c.id} debt={c.balance} />}
    </>
  );
}
