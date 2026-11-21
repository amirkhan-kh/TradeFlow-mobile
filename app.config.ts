import type { ConfigContext, ExpoConfig } from "expo/config";

type Variant = "development" | "preview" | "production";

const variant = (process.env.APP_VARIANT ?? "development") as Variant;
const isDev = variant === "development";

const PACKAGE_ID = "tradeflow.app";
const id = isDev ? `${PACKAGE_ID}.dev` : PACKAGE_ID;

/**
 * Cleartext HTTP (LAN / emulator API) works only in the development variant: it is a debug build, and
 * Expo's debug manifest allows cleartext. Preview and production are release builds — HTTPS only.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: isDev ? "TradeFlow Dev" : "TradeFlow",
  slug: "tradeflow",
  scheme: isDev ? "tradeflow-dev" : "tradeflow",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  userInterfaceStyle: "light",
  backgroundColor: "#f5f8f7",
  android: {
    package: id,
    adaptiveIcon: {
      backgroundColor: "#ecf8f2",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
  },
  ios: {
    bundleIdentifier: id,
    supportsTablet: false,
    config: { usesNonExemptEncryption: false },
  },
  plugins: [
    "expo-router",
    [
      "expo-splash-screen",
      {
        backgroundColor: "#f5f8f7",
        image: "./assets/images/splash-icon.png",
        imageWidth: 76,
      },
    ],
    "expo-secure-store",
    "expo-font",
  ],
  experiments: {
    typedRoutes: false,
    reactCompiler: true,
  },
  owner: "amirxondev",
  extra: {
    variant,
    eas: { projectId: "1a702ef2-c6dd-4736-b187-51f1731f520e" },
  },
});
