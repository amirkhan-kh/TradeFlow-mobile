import { View } from "react-native";
import { AuditsList } from "@/features/audits/AuditsList";
import { useT } from "@/shared/i18n/I18nProvider";
import { ScreenHeader } from "@/shared/ui/Screen";

export default function Tab() {
  const t = useT();
  return (
    <View className="flex-1">
      <ScreenHeader title={t("Audit")} />
      <AuditsList />
    </View>
  );
}
