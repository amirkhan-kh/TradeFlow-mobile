import type { Config } from "tailwindcss";
import { colors, fonts, radii } from "./src/theme/tokens";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        brand: colors.brand,
        ink: colors.ink,
        navy: colors.navy,
        sky: colors.sky,
      },
      borderRadius: {
        card: `${radii.card}px`,
        shell: `${radii.shell}px`,
        icon: `${radii.icon}px`,
        input: `${radii.input}px`,
      },
      fontFamily: {
        sans: [fonts.latin.regular],
        "sans-medium": [fonts.latin.medium],
        "sans-semibold": [fonts.latin.semibold],
        "sans-bold": [fonts.latin.bold],
        "sans-extrabold": [fonts.latin.extrabold],
        cyr: [fonts.cyrillic.regular],
        "cyr-medium": [fonts.cyrillic.medium],
        "cyr-semibold": [fonts.cyrillic.semibold],
        "cyr-bold": [fonts.cyrillic.bold],
        "cyr-extrabold": [fonts.cyrillic.extrabold],
      },
    },
  },
  plugins: [],
} satisfies Config;
