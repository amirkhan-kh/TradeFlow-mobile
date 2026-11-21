import { Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors, fonts } from "@/theme/tokens";

export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <Svg viewBox="78 18 878 900" width={size} height={size} accessible={false}>
      <Path fill={colors.logo.roof} d="M88 272 515 25l430 247-83 48-347-198-345 198Z" />
      <Path fill={colors.logo.wall} d="M88 272l82 48v395l-82-45ZM945 272v398l-83 45V320ZM268 535l229-130v88l-62 35v347l-85-50V580l-82 48Z" />
      <Path fill={colors.logo.flow} d="M232 380 515 215l285 165v100L515 315 232 480ZM537 405l228 130v95l-145-82v64l98 56v97l-98-56v150l-83 48Z" />
    </Svg>
  );
}

/** The wordmark stays Latin in every language, so it always uses Plus Jakarta Sans. */
export function Logo({ size = 36, light = false }: { size?: number; light?: boolean }) {
  return (
    <View className="flex-row items-center gap-2.5" accessible accessibilityRole="image" accessibilityLabel="TradeFlow">
      {light ? (
        <View className="items-center justify-center rounded-icon bg-white" style={{ width: size + 4, height: size + 4 }}>
          <LogoMark size={size * 0.7} />
        </View>
      ) : (
        <LogoMark size={size} />
      )}
      <Text style={{ fontFamily: fonts.latin.extrabold, fontSize: size * 0.5, letterSpacing: -0.4, color: light ? "#ffffff" : colors.logo.wall }}>
        Trade<Text style={{ color: light ? colors.logo.wordLight : colors.logo.word }}>Flow</Text>
      </Text>
    </View>
  );
}
