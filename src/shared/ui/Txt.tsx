import { Text, type TextProps } from "react-native";
import { useI18n } from "@/shared/i18n/I18nProvider";
import { fonts, type FontWeight } from "@/theme/tokens";

/** Font family per weight and script; colour classes in `className` override the default ink-900. */
export function useFontFamily(weight: FontWeight = "regular") {
  const { cyr } = useI18n();
  return (cyr ? fonts.cyrillic : fonts.latin)[weight];
}

const HAS_COLOR = /\btext-(ink|brand|white|red|amber|sky|navy|violet|blue|green|emerald)\b/;

export function Txt({ weight = "regular", className = "", style, ...rest }: TextProps & { weight?: FontWeight; className?: string }) {
  const fontFamily = useFontFamily(weight);
  return <Text {...rest} className={HAS_COLOR.test(className) ? className : `text-ink-900 ${className}`} style={[{ fontFamily }, style]} />;
}
