import { View } from "react-native";
import { DashboardScreen } from "@/features/dashboard/DashboardScreen";
import { useT } from "@/shared/i18n/I18nProvider";
import { useMe } from "@/shared/lib/session";
import { ScreenHeader } from "@/shared/ui/Screen";

export default function Home() {
  const t = useT();
  const me = useMe();
  return (
    <View className="flex-1">
      <ScreenHeader title={t("Dashboard")} subtitle={`${me.full_name} · ${t("Boshqaruv paneli — biznesingizning bugungi holati")}`} />
      <DashboardScreen />
    </View>
  );
}
