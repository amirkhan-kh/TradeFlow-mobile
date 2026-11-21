import Constants from "expo-constants";
import { Download } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { api } from "@/shared/lib/api";
import { Button } from "@/shared/ui/Button";
import { Logo } from "@/shared/ui/Logo";
import { Txt } from "@/shared/ui/Txt";

type Versions = Record<"android" | "ios", { min: string; latest: string }>;

const parts = (v: string) => v.split(".").map((n) => Number.parseInt(n, 10) || 0);
export function older(a: string, b: string) {
  const [x, y] = [parts(a), parts(b)];
  for (let i = 0; i < 3; i++) if ((x[i] ?? 0) !== (y[i] ?? 0)) return (x[i] ?? 0) < (y[i] ?? 0);
  return false;
}

/** Blocks the app when the server says this build is below the supported minimum. Network errors never block. */
export function VersionGate({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [blocked, setBlocked] = useState(false);
  const current = Constants.expoConfig?.version ?? "0.0.0";

  useEffect(() => {
    const os = Platform.OS === "ios" ? "ios" : "android";
    api<Versions>("/public/app-version")
      .then((v) => setBlocked(Boolean(v[os]) && older(current, v[os].min)))
      .catch(() => {});
  }, [current]);

  if (!blocked) return children;
  const id = Constants.expoConfig?.android?.package ?? "tradeflow.app";
  return (
    <View className="flex-1 items-center justify-center gap-4 bg-ink-50 px-8">
      <Logo size={44} />
      <Txt weight="extrabold" className="mt-4 text-center text-xl">
        {t("Ilovani yangilang")}
      </Txt>
      <Txt className="text-center text-sm text-ink-500">{t("Bu versiya eskirgan. Davom etish uchun ilovani yangilang.")}</Txt>
      <Button icon={Download} className="mt-2 self-stretch" onPress={() => Linking.openURL(Platform.OS === "android" ? `market://details?id=${id}` : "https://apps.apple.com")}>
        {t("Yangilash")}
      </Button>
    </View>
  );
}
