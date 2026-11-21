import Constants from "expo-constants";
import { Check, KeyRound, LogOut } from "lucide-react-native";
import { useState } from "react";
import { Alert as RNAlert, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LANG_NAMES, LANGS } from "@/shared/i18n/config";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { api, errorText } from "@/shared/lib/api";
import { fmtDate } from "@/shared/lib/format";
import { ACTIONS, initials, PERMISSIONS, ROLES } from "@/shared/lib/roles";
import { useMe, useSession } from "@/shared/lib/session";
import { useApi } from "@/shared/lib/useApi";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { Card, Divider, InfoRow, SectionTitle } from "@/shared/ui/Card";
import { Field, Input, PasswordInput } from "@/shared/ui/Field";
import { ScrollScreen } from "@/shared/ui/Screen";
import { Alert } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";
import { colors, gradients } from "@/theme/tokens";

interface ActivityItem {
  id: number;
  action: string;
  ip: string | null;
  created_at: string;
  actor_name: string | null;
}

export function ProfileScreen() {
  const { t, lang, setLang } = useI18n();
  const me = useMe();
  const { signOut } = useSession();
  const activity = useApi<{ items: ActivityItem[] }>("/auth/me/activity");
  const role = ROLES[me.role];
  const allowed = PERMISSIONS.flatMap((g) => g.items.filter(([, roles]) => roles.includes(me.role)).map(([label]) => label));

  const logout = () =>
    RNAlert.alert(t("Chiqish"), t("Hisobdan chiqasizmi?"), [
      { text: t("Yo'q"), style: "cancel" },
      { text: t("Chiqish"), style: "destructive", onPress: () => void signOut() },
    ]);

  return (
    <ScrollScreen onRefresh={activity.reload} refreshing={activity.loading && !!activity.data}>
      <Card className="items-center p-5">
        <LinearGradient colors={gradients.avatar} style={{ width: 72, height: 72, borderRadius: 24, alignItems: "center", justifyContent: "center" }}>
          <Txt weight="extrabold" className="text-2xl text-white">
            {initials(me.full_name)}
          </Txt>
        </LinearGradient>
        <Txt weight="extrabold" className="mt-3 text-xl">
          {me.full_name}
        </Txt>
        <Txt className="text-sm text-ink-500">@{me.username}</Txt>
        <View className="mt-2">
          <Badge tone="green">{t(role.label)}</Badge>
        </View>
        <Txt className="mt-2 text-center text-xs text-ink-500">{t(role.description)}</Txt>
        <View className="mt-3 w-full">
          <Divider />
          <InfoRow label={t("Oxirgi kirish")} value={me.last_login_at ? fmtDate(me.last_login_at, true) : t("Hech qachon")} />
          <InfoRow label={t("Parol o'zgargan")} value={me.password_changed_at ? fmtDate(me.password_changed_at, true) : t("Hech qachon")} />
          <InfoRow label={t("Jamoada")} value={t("{date} dan", { date: fmtDate(me.created_at) })} />
        </View>
      </Card>

      <Card className="p-4">
        <SectionTitle>{t("Til")}</SectionTitle>
        <View className="flex-row flex-wrap gap-2">
          {LANGS.map((l) => (
            <Pressable
              key={l}
              accessibilityRole="radio"
              accessibilityState={{ selected: l === lang }}
              onPress={() => setLang(l)}
              className={`h-10 flex-row items-center gap-1.5 rounded-full border px-4 ${l === lang ? "border-brand-600 bg-brand-600" : "border-ink-200 bg-white"}`}
              testID={`lang-${l}`}
            >
              {l === lang && <Check size={14} color="#ffffff" />}
              <Txt weight="semibold" className={`text-sm ${l === lang ? "text-white" : "text-ink-700"}`}>
                {LANG_NAMES[l]}
              </Txt>
            </Pressable>
          ))}
        </View>
      </Card>

      <ProfileForm />
      <PasswordForm />

      <Card className="p-4">
        <SectionTitle>{t("Mening huquqlarim")}</SectionTitle>
        {allowed.map((a) => (
          <View key={a} className="flex-row items-center gap-2 py-1">
            <Check size={14} color={colors.brand[600]} />
            <Txt className="flex-1 text-sm text-ink-700">{t(a)}</Txt>
          </View>
        ))}
      </Card>

      <Card className="p-4">
        <SectionTitle>{t("So'nggi faoliyat")}</SectionTitle>
        {(activity.data?.items ?? []).slice(0, 10).map((a, i) => (
          <View key={a.id}>
            {i > 0 && <Divider />}
            <View className="flex-row items-center justify-between gap-3 py-2">
              <Txt weight="medium" className="flex-1 text-sm">
                {ACTIONS[a.action] ? t(ACTIONS[a.action]!.label) : a.action}
              </Txt>
              <Txt className="text-[11px] text-ink-500">
                {fmtDate(a.created_at, true)}
                {a.ip ? ` · ${a.ip}` : ""}
              </Txt>
            </View>
          </View>
        ))}
        {activity.data && !activity.data.items.length && <Txt className="text-sm text-ink-500">{t("Faoliyat yo'q")}</Txt>}
      </Card>

      <Button variant="danger" icon={LogOut} onPress={logout} testID="logout">
        {t("Chiqish")}
      </Button>
      <Txt className="text-center text-xs text-ink-400">TradeFlow {Constants.expoConfig?.version ?? ""}</Txt>
    </ScrollScreen>
  );
}

function ProfileForm() {
  const { t } = useI18n();
  const me = useMe();
  const { refresh } = useSession();
  const [f, setF] = useState({ full_name: me.full_name, phone: me.phone ?? "", email: me.email ?? "" });
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    setMsg(undefined);
    try {
      await api("/auth/me", { method: "PUT", json: f });
      await refresh();
      setMsg({ ok: true, text: t("Saqlandi") });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="gap-4 p-4">
      <View>
        <Txt weight="bold" className="text-base">
          {t("Shaxsiy ma'lumotlar")}
        </Txt>
        <Txt className="text-xs text-ink-500">{t("Ism, telefon va email hamkasblaringizga ko'rinadi.")}</Txt>
      </View>
      <Field label={t("To'liq ism")}>
        <Input value={f.full_name} onChangeText={(v) => setF((x) => ({ ...x, full_name: v }))} maxLength={80} />
      </Field>
      <Field label={t("Telefon")}>
        <Input value={f.phone} onChangeText={(v) => setF((x) => ({ ...x, phone: v }))} keyboardType="phone-pad" placeholder="+998 …" />
      </Field>
      <Field label={t("Email")}>
        <Input value={f.email} onChangeText={(v) => setF((x) => ({ ...x, email: v }))} keyboardType="email-address" autoCapitalize="none" placeholder={t("ism@kompaniya.uz")} />
      </Field>
      {msg && <Alert ok={msg.ok}>{msg.text}</Alert>}
      <Button icon={Check} loading={saving} onPress={submit}>
        {t("Saqlash")}
      </Button>
    </Card>
  );
}

function PasswordForm() {
  const { t } = useI18n();
  const { refresh } = useSession();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string }>();
  const [saving, setSaving] = useState(false);
  const mismatch = repeat.length > 0 && next !== repeat;

  async function submit() {
    if (mismatch || !current || !next) return;
    setSaving(true);
    setMsg(undefined);
    try {
      const r = await api<{ token?: string }>("/auth/me/password", { method: "POST", json: { current_password: current, new_password: next } });
      await refresh(r.token);
      setCurrent("");
      setNext("");
      setRepeat("");
      setMsg({ ok: true, text: t("Parol yangilandi") });
    } catch (e) {
      setMsg({ ok: false, text: errorText(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="gap-4 p-4">
      <View>
        <Txt weight="bold" className="text-base">
          {t("Parolni o'zgartirish")}
        </Txt>
        <Txt className="text-xs text-ink-500">{t("Kamida 8 belgi, harf va raqam. Parol o'zgarganda boshqa qurilmalardagi sessiyalar yopiladi.")}</Txt>
      </View>
      <Field label={t("Joriy parol")}>
        <PasswordInput value={current} onChangeText={setCurrent} autoComplete="current-password" />
      </Field>
      <Field label={t("Yangi parol")}>
        <PasswordInput value={next} onChangeText={setNext} autoComplete="new-password" />
      </Field>
      <Field label={t("Yangi parolni takrorlang")} error={mismatch ? t("Parollar mos emas") : undefined}>
        <PasswordInput value={repeat} onChangeText={setRepeat} />
      </Field>
      {msg && <Alert ok={msg.ok}>{msg.text}</Alert>}
      <Button icon={KeyRound} variant="secondary" loading={saving} disabled={mismatch || !current || next.length < 8} onPress={submit}>
        {t("Parolni o'zgartirish")}
      </Button>
    </Card>
  );
}
