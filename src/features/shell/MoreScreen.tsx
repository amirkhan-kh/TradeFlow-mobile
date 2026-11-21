import { router } from "expo-router";
import { ChevronRight, ExternalLink, LogOut } from "lucide-react-native";
import { Alert as RNAlert, Linking, Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useT } from "@/shared/i18n/I18nProvider";
import { WEB_URL } from "@/shared/lib/env";
import { initials, ROLES } from "@/shared/lib/roles";
import { useMe, useSession } from "@/shared/lib/session";
import { Card } from "@/shared/ui/Card";
import { ScrollScreen } from "@/shared/ui/Screen";
import { Txt } from "@/shared/ui/Txt";
import { colors, gradients } from "@/theme/tokens";
import { MORE, MORE_META, PROFILE_ICON } from "./nav";

function Row({ icon: Icon, label, onPress, last, testID }: { icon: typeof PROFILE_ICON; label: string; onPress: () => void; last?: boolean; testID?: string }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} testID={testID} className={`flex-row items-center gap-3 px-4 py-3.5 active:bg-ink-50 ${last ? "" : "border-b border-ink-100"}`}>
      <View className="size-9 items-center justify-center rounded-icon bg-brand-50">
        <Icon size={18} color={colors.brand[700]} />
      </View>
      <Txt weight="semibold" className="flex-1 text-[15px]">
        {label}
      </Txt>
      <ChevronRight size={18} color={colors.ink[300]} />
    </Pressable>
  );
}

export function MoreScreen() {
  const t = useT();
  const me = useMe();
  const { signOut } = useSession();
  const items = MORE[me.role];

  const logout = () =>
    RNAlert.alert(t("Chiqish"), t("Hisobdan chiqasizmi?"), [
      { text: t("Yo'q"), style: "cancel" },
      { text: t("Chiqish"), style: "destructive", onPress: () => void signOut() },
    ]);

  return (
    <ScrollScreen>
      <Card className="flex-row items-center gap-3 p-4" onPress={() => router.push("/profile")}>
        <LinearGradient colors={gradients.avatar} style={{ width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" }}>
          <Txt weight="extrabold" className="text-lg text-white">
            {initials(me.full_name)}
          </Txt>
        </LinearGradient>
        <View className="flex-1">
          <Txt weight="bold" className="text-base" numberOfLines={1}>
            {me.full_name}
          </Txt>
          <Txt className="text-xs text-ink-500">
            {t(ROLES[me.role].label)} · @{me.username}
          </Txt>
        </View>
        <ChevronRight size={18} color={colors.ink[300]} />
      </Card>

      <Card className="overflow-hidden">
        {items.map((s, i) => (
          <Row key={s} icon={MORE_META[s].icon} label={t(MORE_META[s].label)} onPress={() => router.push(`/m/${s}`)} last={i === items.length - 1} testID={`more-${s}`} />
        ))}
      </Card>

      <Card className="overflow-hidden">
        <Row icon={PROFILE_ICON} label={t("Profilim")} onPress={() => router.push("/profile")} last={me.role !== "admin"} testID="more-profile" />
        {me.role === "admin" && <Row icon={ExternalLink} label={t("Xodimlar va rollar")} onPress={() => Linking.openURL(`${WEB_URL}/dashboard/users`)} last />}
      </Card>

      <Pressable accessibilityRole="button" onPress={logout} className="flex-row items-center justify-center gap-2 rounded-card border border-red-200 bg-white py-3.5 active:bg-red-50" testID="more-logout">
        <LogOut size={18} color="#dc2626" />
        <Txt weight="bold" className="text-red-600">
          {t("Chiqish")}
        </Txt>
      </Pressable>
    </ScrollScreen>
  );
}
