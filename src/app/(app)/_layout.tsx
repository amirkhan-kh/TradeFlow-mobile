import { Redirect, Stack } from "expo-router";
import { useT } from "@/shared/i18n/I18nProvider";
import { useSession } from "@/shared/lib/session";
import { Loading } from "@/shared/ui/States";
import { useFontFamily } from "@/shared/ui/Txt";
import { colors } from "@/theme/tokens";

/** Everything behind login. Any 401 signs out, and this guard sends the user back to the welcome screen. */
export default function AppLayout() {
  const t = useT();
  const { status } = useSession();
  const font = useFontFamily("bold");
  if (status === "loading") return <Loading full />;
  if (status === "signedOut") return <Redirect href="/welcome" />;

  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.ink[50] },
        headerTintColor: colors.ink[900],
        headerTitleStyle: { fontFamily: font, fontSize: 17 },
        headerBackButtonDisplayMode: "minimal",
        contentStyle: { backgroundColor: colors.ink[50] },
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="orders/new" options={{ title: t("Yangi buyurtma") }} />
      <Stack.Screen name="clients/new" options={{ title: t("Yangi mijoz") }} />
      <Stack.Screen name="profile" options={{ title: t("Profilim") }} />
    </Stack>
  );
}
