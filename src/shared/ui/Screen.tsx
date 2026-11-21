import { RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "@/theme/tokens";
import { Txt } from "./Txt";

/** Top bar for tab screens (stack screens use the native header). */
export function ScreenHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-row items-center gap-3 bg-ink-50 px-4 pb-3" style={{ paddingTop: insets.top + 10 }}>
      <View className="flex-1">
        <Txt weight="extrabold" className="text-2xl" accessibilityRole="header" numberOfLines={1}>
          {title}
        </Txt>
        {subtitle ? (
          <Txt className="text-xs text-ink-500" numberOfLines={2}>
            {subtitle}
          </Txt>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function ScrollScreen({ children, refreshing = false, onRefresh, className = "" }: { children: React.ReactNode; refreshing?: boolean; onRefresh?: () => void; className?: string }) {
  return (
    <ScrollView
      className="flex-1 bg-ink-50"
      contentContainerClassName={`gap-4 px-4 pb-10 pt-2 ${className}`}
      keyboardShouldPersistTaps="handled"
      refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand[600]]} tintColor={colors.brand[600]} /> : undefined}
    >
      {children}
    </ScrollView>
  );
}
