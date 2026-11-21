import { CircleAlert, CircleCheck, Inbox, WifiOff } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { colors } from "@/theme/tokens";
import { Button } from "./Button";
import { Txt } from "./Txt";

export function Loading({ full = false }: { full?: boolean }) {
  return (
    <View className={`items-center justify-center ${full ? "flex-1" : "py-16"}`} accessibilityLabel="loading">
      <ActivityIndicator size="large" color={colors.brand[600]} />
    </View>
  );
}

export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <View className="items-center px-8 py-16">
      <View className="size-14 items-center justify-center rounded-full bg-ink-100">
        <Inbox size={26} color={colors.ink[400]} />
      </View>
      <Txt weight="bold" className="mt-3 text-center text-base">
        {title}
      </Txt>
      {hint ? <Txt className="mt-1 text-center text-sm text-ink-500">{hint}</Txt> : null}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const t = useT();
  return (
    <View className="items-center px-8 py-16">
      <View className="size-14 items-center justify-center rounded-full bg-red-50">
        <WifiOff size={24} color="#dc2626" />
      </View>
      <Txt weight="semibold" className="mt-3 text-center text-sm text-ink-700">
        {message}
      </Txt>
      {onRetry ? (
        <Button variant="secondary" size="sm" className="mt-4" onPress={onRetry}>
          {t("Qayta urinish")}
        </Button>
      ) : null}
    </View>
  );
}

export function Alert({ children, ok = false }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <View accessibilityRole="alert" className={`flex-row items-start gap-2 rounded-input border px-3.5 py-3 ${ok ? "border-brand-200 bg-brand-50" : "border-red-200 bg-red-50"}`}>
      {ok ? <CircleCheck size={18} color={colors.brand[700]} /> : <CircleAlert size={18} color="#b91c1c" />}
      <Txt weight="medium" className={`flex-1 text-sm ${ok ? "text-brand-800" : "text-red-700"}`}>
        {children}
      </Txt>
    </View>
  );
}
