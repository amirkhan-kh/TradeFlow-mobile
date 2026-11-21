import type { LucideIcon } from "lucide-react-native";
import { Pressable, View, type ViewProps } from "react-native";
import { colors, shadows } from "@/theme/tokens";
import { Txt } from "./Txt";

export function Card({ className = "", style, onPress, children, ...rest }: ViewProps & { className?: string; onPress?: () => void }) {
  const cls = `rounded-card border border-ink-100 bg-white ${className}`;
  if (onPress)
    return (
      <Pressable accessibilityRole="button" onPress={onPress} className={`${cls} active:bg-ink-50`} style={[shadows.soft, style as object]} {...rest}>
        {children}
      </Pressable>
    );
  return (
    <View className={cls} style={[shadows.soft, style]} {...rest}>
      {children}
    </View>
  );
}

export function SectionTitle({ children, hint, right }: { children: React.ReactNode; hint?: string; right?: React.ReactNode }) {
  return (
    <View className="mb-3 flex-row items-end justify-between gap-3">
      <View className="shrink">
        <Txt weight="bold" className="text-base">
          {children}
        </Txt>
        {hint ? <Txt className="text-xs text-ink-500">{hint}</Txt> : null}
      </View>
      {right}
    </View>
  );
}

const TONES = {
  brand: { bg: colors.brand[50], fg: colors.brand[600] },
  navy: { bg: "#e8eef4", fg: colors.navy[500] },
  amber: { bg: "#fef3c7", fg: "#b45309" },
  red: { bg: "#fee2e2", fg: "#dc2626" },
  violet: { bg: "#ede9fe", fg: "#7c3aed" },
} as const;
export type KpiTone = keyof typeof TONES;

export function KpiCard({ label, value, icon: Icon, tone = "brand", hint, onPress }: { label: string; value: React.ReactNode; icon: LucideIcon; tone?: KpiTone; hint?: React.ReactNode; onPress?: () => void }) {
  const c = TONES[tone];
  return (
    <Card className="flex-1 p-4" onPress={onPress}>
      <View className="flex-row items-start justify-between gap-2">
        <Txt className="shrink text-xs text-ink-500" numberOfLines={2}>
          {label}
        </Txt>
        <View className="size-9 items-center justify-center rounded-icon" style={{ backgroundColor: c.bg }}>
          <Icon size={18} color={c.fg} />
        </View>
      </View>
      {typeof value === "string" || typeof value === "number" ? (
        <Txt weight="extrabold" className="mt-1 text-xl" numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Txt>
      ) : (
        <View className="mt-1">{value}</View>
      )}
      {hint ? typeof hint === "string" ? <Txt className="mt-1 text-[11px] text-ink-500">{hint}</Txt> : <View className="mt-1">{hint}</View> : null}
    </Card>
  );
}

export function Progress({ pct, tone }: { pct: number; tone?: "brand" | "amber" | "red" }) {
  const t = tone ?? (pct > 100 ? "red" : pct > 75 ? "amber" : "brand");
  const bg = t === "red" ? "bg-red-500" : t === "amber" ? "bg-amber-400" : "bg-brand-500";
  return (
    <View className="h-1.5 overflow-hidden rounded-full bg-ink-100">
      <View className={`h-full rounded-full ${bg}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
    </View>
  );
}

export function InfoRow({ icon: Icon, label, value, onPress }: { icon?: LucideIcon; label?: string; value: React.ReactNode; onPress?: () => void }) {
  const body = (
    <View className="flex-row items-center gap-3 py-2">
      {Icon ? <Icon size={16} color={colors.ink[400]} /> : null}
      {label ? <Txt className="text-sm text-ink-500">{label}</Txt> : null}
      <Txt weight="medium" className={`flex-1 text-sm ${label ? "text-right" : ""} ${onPress ? "text-brand-700" : "text-ink-800"}`} numberOfLines={2}>
        {value}
      </Txt>
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="link" onPress={onPress}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

export function Divider() {
  return <View className="h-px bg-ink-100" />;
}
