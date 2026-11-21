import { ExternalLink, Share2 } from "lucide-react-native";
import { useState } from "react";
import { Linking, Share, View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { api, errorText, qs } from "@/shared/lib/api";
import { currency } from "@/shared/lib/format";
import { Button, IconButton } from "@/shared/ui/Button";
import { Field, Input, toNum } from "@/shared/ui/Field";
import { Sheet } from "@/shared/ui/Sheet";
import { Alert } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";
import { colors } from "@/theme/tokens";

interface PayLink {
  provider: "payme" | "click";
  name: string;
  url: string;
}

export function PaymentLinksSheet({ open, onClose, clientId, debt }: { open: boolean; onClose: () => void; clientId: number; debt: number }) {
  const t = useT();
  const [amount, setAmount] = useState(debt > 0 ? String(Math.round(debt)) : "");
  const [order, setOrder] = useState("");
  const [links, setLinks] = useState<PayLink[]>();
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function create() {
    setLoading(true);
    setError(undefined);
    try {
      const r = await api<{ items: PayLink[] }>(`/payments/links${qs({ client_id: clientId, amount: toNum(amount), order_number: order.trim().toUpperCase() || undefined })}`);
      setLinks(r.items);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={t("Onlayn to'lov havolasi")} description={t("Payme / Click havolasini mijozga SMS yoki Telegram orqali yuboring")}>
      <Field label={t("Summa, {cur}", { cur: currency() })}>
        <Input value={amount} onChangeText={setAmount} keyboardType="number-pad" />
      </Field>
      <Field label={t("Buyurtma raqami (ixtiyoriy)")}>
        <Input value={order} onChangeText={setOrder} placeholder="TF-000123" autoCapitalize="characters" />
      </Field>
      <Button loading={loading} disabled={(toNum(amount) ?? 0) < 1000} onPress={create}>
        {t("Havola yaratish")}
      </Button>
      {error && <Alert>{error}</Alert>}
      {links && !links.length && <Alert>{t("Payme yoki Click integratsiyasi ulanmagan — Sozlamalar → Integratsiyalar.")}</Alert>}
      {links?.map((l) => (
        <View key={l.url} className="flex-row items-center gap-2 rounded-input border border-ink-100 p-3">
          <View className="flex-1">
            <Txt weight="bold" className="text-sm">
              {l.name}
            </Txt>
            <Txt className="text-xs text-ink-500" numberOfLines={1}>
              {l.url}
            </Txt>
          </View>
          <IconButton icon={Share2} color={colors.brand[700]} label={t("{name} havolasini nusxalash", { name: l.name })} onPress={() => Share.share({ message: l.url })} />
          <IconButton icon={ExternalLink} label={t("{name} havolasini ochish", { name: l.name })} onPress={() => Linking.openURL(l.url)} />
        </View>
      ))}
    </Sheet>
  );
}
