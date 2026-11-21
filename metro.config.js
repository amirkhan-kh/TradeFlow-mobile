const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// rem = 16 like the web app, so `text-sm`, `p-4`, `h-10` match the web pixel sizes (NativeWind defaults to 14).
module.exports = withNativeWind(config, { input: "./src/global.css", inlineRem: 16 });
