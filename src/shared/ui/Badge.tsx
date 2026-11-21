import { View } from "react-native";
import { useT } from "@/shared/i18n/I18nProvider";
import { statusOf, type Tone } from "@/shared/lib/status";
import { Txt } from "./Txt";

const TONES: Record<Tone, { box: string; text: string }> = {
  green: { box: "bg-brand-50 border-brand-200", text: "text-brand-700" },
  amber: { box: "bg-amber-50 border-amber-200", text: "text-amber-700" },
  red: { box: "bg-red-50 border-red-200", text: "text-red-700" },
  blue: { box: "bg-blue-50 border-blue-200", text: "text-blue-700" },
  gray: { box: "bg-ink-100 border-ink-200", text: "text-ink-600" },
  violet: { box: "bg-violet-50 border-violet-200", text: "text-violet-700" },
};

export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  const c = TONES[tone];
  return (
    <View className={`self-start rounded-full border px-2.5 py-0.5 ${c.box}`}>
      <Txt weight="semibold" className={`text-[11px] ${c.text}`} numberOfLines={1}>
        {children}
      </Txt>
    </View>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const t = useT();
  const s = statusOf(status);
  return <Badge tone={s.tone}>{t(s.label)}</Badge>;
}
