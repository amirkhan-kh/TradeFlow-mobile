import type { LucideIcon } from "lucide-react-native";
import { ActivityIndicator, Pressable, View } from "react-native";
import { colors } from "@/theme/tokens";
import { Txt } from "./Txt";

type Variant = "primary" | "secondary" | "ghost" | "danger";

const BOX: Record<Variant, string> = {
  primary: "bg-brand-600 active:bg-brand-700",
  secondary: "bg-white border border-ink-200 active:bg-ink-50",
  ghost: "bg-transparent active:bg-ink-100",
  danger: "bg-red-600 active:bg-red-700",
};
const TEXT: Record<Variant, string> = { primary: "text-white", secondary: "text-ink-800", ghost: "text-ink-700", danger: "text-white" };
const ICON: Record<Variant, string> = { primary: "#ffffff", secondary: colors.ink[700], ghost: colors.ink[700], danger: "#ffffff" };

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  icon: Icon,
  loading = false,
  disabled = false,
  className = "",
  testID,
}: {
  children?: React.ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: "md" | "sm";
  icon?: LucideIcon;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  testID?: string;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityState={{ disabled: off, busy: loading }}
      onPress={off ? undefined : onPress}
      className={`flex-row items-center justify-center gap-2 rounded-input ${size === "md" ? "min-h-12 px-5" : "min-h-9 px-3"} ${BOX[variant]} ${off ? "opacity-60" : ""} ${className}`}
    >
      {loading ? <ActivityIndicator size="small" color={ICON[variant]} /> : Icon ? <Icon size={size === "md" ? 18 : 15} color={ICON[variant]} /> : null}
      {children != null && (
        <View className="shrink">
          <Txt weight="bold" numberOfLines={1} className={`${TEXT[variant]} ${size === "md" ? "text-[15px]" : "text-xs"}`}>
            {children}
          </Txt>
        </View>
      )}
    </Pressable>
  );
}

export function IconButton({ icon: Icon, onPress, label, color = colors.ink[700], className = "" }: { icon: LucideIcon; onPress: () => void; label: string; color?: string; className?: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} hitSlop={8} onPress={onPress} className={`size-10 items-center justify-center rounded-full active:bg-ink-100 ${className}`}>
      <Icon size={20} color={color} />
    </Pressable>
  );
}
