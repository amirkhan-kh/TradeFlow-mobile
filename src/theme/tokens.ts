/**
 * Design tokens copied from the web app (`frontend/src/app/globals.css`, `shared/ui/Logo.tsx`).
 * One source for the NativeWind theme (`tailwind.config.ts`) and for plain RN styles (gradients, shadows, SVG).
 */

export const colors = {
  brand: {
    50: "#ecf8f2",
    100: "#d2efe0",
    200: "#a7dfc4",
    300: "#6fc8a1",
    400: "#3dae7f",
    500: "#1f9366",
    600: "#137852",
    700: "#0f6044",
    800: "#0e4c37",
    900: "#0c3f2e",
    950: "#062419",
  },
  ink: {
    50: "#f5f8f7",
    100: "#eaf0ee",
    200: "#d8e1de",
    300: "#b6c4bf",
    400: "#8a9b95",
    500: "#66776f",
    600: "#4b5b55",
    700: "#364540",
    800: "#1f2d29",
    900: "#13201c",
  },
  navy: {
    500: "#2a4a6b",
    700: "#18324d",
    900: "#0f2236",
  },
  sky: "#9cc3dc",
  logo: {
    roof: "#537a89",
    wall: "#32536b",
    flow: "#8bc474",
    word: "#4d8a3a",
    wordLight: "#a6d48a",
  },
} as const;

/** Heading gradient (`.text-aurora` / `.text-aurora-dark`) and surface gradients. */
export const gradients = {
  aurora: ["#32536b", "#4f86ab", colors.brand[500]],
  auroraDark: ["#e3f0f8", "#9cc3dc", "#a6d48a"],
  avatar: [colors.brand[400], colors.brand[700]],
  promo: [colors.brand[600], colors.brand[800]],
  glass: ["rgba(255,255,255,0.7)", "rgba(255,255,255,0.4)"],
} as const;

/** `--shadow-soft` / `--shadow-lift` translated to RN shadow props + Android elevation. */
export const shadows = {
  soft: {
    shadowColor: "#102820",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  lift: {
    shadowColor: "#102820",
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;

export const radii = {
  card: 16,
  shell: 24,
  icon: 12,
  input: 12,
} as const;

/**
 * Android picks a font file by family name, not by `fontWeight`, so every weight is its own family.
 * Plus Jakarta Sans has no Cyrillic: `ru`, `ky`, `uz-Cyrl` use Manrope (same switch as the web).
 */
export const fonts = {
  latin: {
    regular: "PlusJakartaSans_400Regular",
    medium: "PlusJakartaSans_500Medium",
    semibold: "PlusJakartaSans_600SemiBold",
    bold: "PlusJakartaSans_700Bold",
    extrabold: "PlusJakartaSans_800ExtraBold",
  },
  cyrillic: {
    regular: "Manrope_400Regular",
    medium: "Manrope_500Medium",
    semibold: "Manrope_600SemiBold",
    bold: "Manrope_700Bold",
    extrabold: "Manrope_800ExtraBold",
  },
} as const;

export type FontWeight = keyof typeof fonts.latin;
