/** Inlined at build time from `.env.local` (dev) or the `eas.json` profile env (preview/production). */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? "http://10.0.2.2:4002/api/v1").replace(/\/$/, "");
export const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? "https://trade-flow-one-psi.vercel.app").replace(/\/$/, "");
