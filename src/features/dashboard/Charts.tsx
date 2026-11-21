import { useState } from "react";
import { View } from "react-native";
import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";
import { useT } from "@/shared/i18n/I18nProvider";
import { dayLabel, fmtCompact, fmtNum, monthLabel } from "@/shared/lib/format";
import { statusOf } from "@/shared/lib/status";
import { Txt, useFontFamily } from "@/shared/ui/Txt";
import { colors } from "@/theme/tokens";

const AXIS = { color: colors.ink[400], fontSize: 10 };
const Y_W = 60;

function useWidth() {
  const [w, setW] = useState(0);
  return { w, onLayout: (e: { nativeEvent: { layout: { width: number } } }) => setW(e.nativeEvent.layout.width) };
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  return (
    <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1">
      {items.map((i) => (
        <View key={i.label} className="flex-row items-center gap-1.5">
          <View className="size-2.5 rounded-full" style={{ backgroundColor: i.color }} />
          <Txt className="text-xs text-ink-600">{i.label}</Txt>
        </View>
      ))}
    </View>
  );
}

export function DailyChart({ data }: { data: { day: string; revenue: number }[] }) {
  const { w, onLayout } = useWidth();
  const fontFamily = useFontFamily();
  const points = data.map((d, i) => ({ value: Number(d.revenue), label: i % 7 === 0 ? dayLabel(d.day) : "" }));
  const spacing = points.length > 1 ? Math.max(4, (w - Y_W - 24) / (points.length - 1)) : 20;
  return (
    <View onLayout={onLayout}>
      {w > 0 && points.length > 0 && (
        <LineChart
          data={points}
          areaChart
          curved
          hideDataPoints
          thickness={2.5}
          color={colors.brand[500]}
          startFillColor={colors.brand[400]}
          endFillColor={colors.brand[50]}
          startOpacity={0.35}
          endOpacity={0.02}
          width={w - Y_W}
          height={170}
          spacing={spacing}
          initialSpacing={6}
          endSpacing={6}
          noOfSections={4}
          yAxisLabelWidth={Y_W}
          yAxisThickness={0}
          xAxisColor={colors.ink[200]}
          rulesColor={colors.ink[100]}
          rulesType="solid"
          yAxisTextStyle={{ ...AXIS, fontFamily }}
          xAxisLabelTextStyle={{ ...AXIS, fontFamily, width: 50 }}
          formatYLabel={(l) => fmtCompact(Number(l))}
          isAnimated
        />
      )}
    </View>
  );
}

/** Two series per month, drawn as grouped bars. */
export function PairBars({ data, a, b }: { data: { month: string; a: number; b: number }[]; a: { label: string; color: string }; b: { label: string; color: string } }) {
  const { w, onLayout } = useWidth();
  const fontFamily = useFontFamily();
  const n = Math.max(1, data.length);
  const group = (w - Y_W - 16) / n;
  const bar = Math.max(6, Math.min(18, group * 0.32));
  const bars = data.flatMap((d) => [
    { value: Number(d.a), label: monthLabel(d.month), spacing: 3, frontColor: a.color, labelWidth: bar * 2 + 3, labelTextStyle: { ...AXIS, fontFamily } },
    { value: Number(d.b), frontColor: b.color },
  ]);
  return (
    <View onLayout={onLayout}>
      {w > 0 && data.length > 0 && (
        <BarChart
          data={bars}
          barWidth={bar}
          spacing={Math.max(6, group - bar * 2 - 3)}
          initialSpacing={8}
          width={w - Y_W}
          height={170}
          noOfSections={4}
          roundedTop
          barBorderTopLeftRadius={4}
          barBorderTopRightRadius={4}
          yAxisLabelWidth={Y_W}
          yAxisThickness={0}
          xAxisColor={colors.ink[200]}
          rulesColor={colors.ink[100]}
          rulesType="solid"
          yAxisTextStyle={{ ...AXIS, fontFamily }}
          formatYLabel={(l) => fmtCompact(Number(l))}
          isAnimated
        />
      )}
      <Legend items={[a, b]} />
    </View>
  );
}

const PIE: Record<string, string> = { new: "#38bdf8", confirmed: "#8b5cf6", shipped: "#f59e0b", delivered: colors.brand[500], cancelled: colors.ink[300] };

export function StatusPie({ data }: { data: { status: string; count: number }[] }) {
  const t = useT();
  const total = data.reduce((s, d) => s + Number(d.count), 0);
  if (!total) return null;
  return (
    <View className="flex-row items-center gap-5">
      <PieChart
        data={data.map((d) => ({ value: Number(d.count), color: PIE[d.status] ?? colors.ink[400] }))}
        donut
        radius={64}
        innerRadius={44}
        centerLabelComponent={() => (
          <Txt weight="extrabold" className="text-lg">
            {fmtNum(total)}
          </Txt>
        )}
      />
      <View className="flex-1 gap-2">
        {data.map((d) => (
          <View key={d.status} className="flex-row items-center gap-2">
            <View className="size-2.5 rounded-full" style={{ backgroundColor: PIE[d.status] ?? colors.ink[400] }} />
            <Txt className="flex-1 text-sm text-ink-600">{t(statusOf(d.status).label)}</Txt>
            <Txt weight="bold" className="text-sm">
              {fmtNum(d.count)}
            </Txt>
          </View>
        ))}
      </View>
    </View>
  );
}
