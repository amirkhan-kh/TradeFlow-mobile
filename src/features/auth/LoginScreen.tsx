import Constants from "expo-constants";
import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useRef, useState, type ComponentRef } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useT } from "@/shared/i18n/I18nProvider";
import { errorText } from "@/shared/lib/api";
import { useSession } from "@/shared/lib/session";
import { Button, IconButton } from "@/shared/ui/Button";
import { Field, Input, PasswordInput } from "@/shared/ui/Field";
import { Logo } from "@/shared/ui/Logo";
import { Alert } from "@/shared/ui/States";
import { Txt } from "@/shared/ui/Txt";
import { LangPicker } from "./LangPicker";

/** Seeded demo logins (`SEED_DEMO=true`); hidden in the store build. */
const DEMO = [
  ["admin", "admin123"],
  ["manager", "demo123"],
  ["agent1", "demo123"],
  ["courier1", "demo123"],
  ["auditor1", "demo123"],
] as const;
const showDemo = Constants.expoConfig?.extra?.variant !== "production";

export function LoginScreen() {
  const t = useT();
  const insets = useSafeAreaInsets();
  const { signIn } = useSession();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const pass = useRef<ComponentRef<typeof TextInput>>(null);

  async function submit() {
    if (!username.trim() || !password) return;
    setLoading(true);
    setError(undefined);
    try {
      await signIn(username.trim(), password);
      router.replace("/");
    } catch (e) {
      setError(errorText(e));
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-ink-50">
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerClassName="grow px-6" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 24 }}>
        <View className="flex-row items-center justify-between">
          {router.canGoBack() ? <IconButton icon={ChevronLeft} label={t("Yopish")} onPress={() => router.back()} /> : <View />}
          <LangPicker />
        </View>
        <View className="flex-1 justify-center py-8">
          <Logo size={44} />
          <Txt weight="extrabold" className="mt-8 text-[28px] leading-9">
            {t("{brand}'ga xush kelibsiz", { brand: "TradeFlow" })}
          </Txt>
          <Txt className="mt-1 text-[15px] text-ink-500">{t("Davom etish uchun hisobingizga kiring")}</Txt>

          <View className="mt-8 gap-4">
            <Field label={t("Login")}>
              <Input
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                textContentType="username"
                returnKeyType="next"
                onSubmitEditing={() => pass.current?.focus()}
                testID="login-username"
              />
            </Field>
            <Field label={t("Parol")}>
              <PasswordInput ref={pass} value={password} onChangeText={setPassword} autoComplete="current-password" textContentType="password" returnKeyType="go" onSubmitEditing={submit} testID="login-password" />
            </Field>
            {error && <Alert>{error}</Alert>}
            <Button loading={loading} disabled={!username.trim() || !password} onPress={submit} testID="login-submit">
              {loading ? t("Kirilmoqda…") : t("Tizimga kirish")}
            </Button>
          </View>

          {showDemo && (
            <View className="mt-8">
              <Txt className="mb-2 text-xs text-ink-500">{t("Demo hisoblar")}</Txt>
              <View className="flex-row flex-wrap gap-2">
                {DEMO.map(([u, p]) => (
                  <Pressable
                    key={u}
                    onPress={() => {
                      setUsername(u);
                      setPassword(p);
                    }}
                    className="rounded-full border border-ink-200 bg-white px-3 py-1.5 active:bg-ink-50"
                  >
                    <Txt weight="semibold" className="text-xs text-ink-700">
                      {u}
                    </Txt>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
