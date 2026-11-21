import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { ClipboardCheck, ShieldCheck, Sparkles } from "lucide-react-native";
import { useState } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/shared/i18n/I18nProvider";
import { api, errorText } from "@/shared/lib/api";
import { Button } from "@/shared/ui/Button";
import { Field, Input } from "@/shared/ui/Field";
import { Logo } from "@/shared/ui/Logo";
import { Sheet } from "@/shared/ui/Sheet";
import { Alert } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";
import { colors } from "@/theme/tokens";
import { LangPicker } from "./LangPicker";

export function WelcomeScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const [demo, setDemo] = useState(false);

  const features = [
    { icon: ClipboardCheck, text: t("Buyurtma, ombor, audit va yetkazish bitta tizimda") },
    { icon: Sparkles, text: t("5 ta aqlli agent muammolarni oldindan sezadi") },
    { icon: ShieldCheck, text: t("Rollar bo'yicha ruxsatlar va shifrlangan sessiya") },
  ];

  return (
    <LinearGradient colors={[colors.navy[900], colors.navy[700], colors.brand[800]]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      <ScrollView contentContainerClassName="grow px-6" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}>
        <View className="flex-row items-center justify-between">
          <Logo size={34} light />
          <LangPicker light />
        </View>

        <View className="mt-8 overflow-hidden rounded-shell">
          <Image source={require("../../../assets/images/welcome-warehouse.webp")} style={{ width: "100%", height: 200 }} contentFit="cover" accessible={false} />
        </View>

        <Txt weight="extrabold" className="mt-8 text-[30px] leading-[38px] text-white" accessibilityRole="header">
          {t("Ombordan savdo nuqtasigacha — to'liq nazorat")}
        </Txt>
        <View className="mt-6 gap-4">
          {features.map(({ icon: Icon, text }) => (
            <View key={text} className="flex-row items-center gap-3">
              <View className="size-10 items-center justify-center rounded-icon bg-white/10">
                <Icon size={20} color={colors.logo.wordLight} />
              </View>
              <Txt weight="medium" className="flex-1 text-[15px] text-white">
                {text}
              </Txt>
            </View>
          ))}
        </View>

        <View className="flex-1" />
        <View className="mt-10 gap-3">
          <Button onPress={() => router.push("/login")} testID="welcome-login">
            {t("Tizimga kirish")}
          </Button>
          <Button variant="secondary" onPress={() => setDemo(true)} testID="welcome-demo">
            {t("Demoga yozilish")}
          </Button>
        </View>
      </ScrollView>
      {demo && <DemoSheet onClose={() => setDemo(false)} />}
    </LinearGradient>
  );
}

function DemoSheet({ onClose }: { onClose: () => void }) {
  const t = useT();
  const [f, setF] = useState({ name: "", phone: "", company: "", message: "" });
  const [error, setError] = useState<string>();
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  async function submit() {
    setSaving(true);
    setError(undefined);
    try {
      await api("/public/leads", { method: "POST", json: { name: f.name.trim(), phone: f.phone.trim(), company: f.company.trim() || undefined, message: f.message.trim() || undefined } });
      setSent(true);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onClose={onClose} title={t("Demoga yozilish")} description={t("Ma'lumot qoldiring — mutaxassisimiz siz bilan bog'lanadi")}>
      {sent ? (
        <>
          <Alert ok>{t("So'rov yuborildi — tez orada bog'lanamiz")}</Alert>
          <Button variant="secondary" onPress={onClose}>
            {t("Yopish")}
          </Button>
        </>
      ) : (
        <>
          <Field label={t("Ism")}>
            <Input value={f.name} onChangeText={set("name")} maxLength={80} autoComplete="name" />
          </Field>
          <Field label={t("Telefon")}>
            <Input value={f.phone} onChangeText={set("phone")} keyboardType="phone-pad" placeholder="+998 …" maxLength={30} autoComplete="tel" />
          </Field>
          <Field label={t("Kompaniya")}>
            <Input value={f.company} onChangeText={set("company")} />
          </Field>
          <Field label={t("Xabar")}>
            <Input value={f.message} onChangeText={set("message")} multiline />
          </Field>
          {error && <Alert>{error}</Alert>}
          <Button loading={saving} disabled={f.name.trim().length < 2 || f.phone.trim().length < 7} onPress={submit}>
            {t("Yuborish")}
          </Button>
        </>
      )}
    </Sheet>
  );
}
