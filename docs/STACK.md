# STACK LOCK

Status: **LOCKED** — 2026-11-06. No switch later.

| Layer | Choice |
|---|---|
| UI | Expo SDK 58 + React Native 0.88 + TypeScript strict + Expo Router (`src/app`) + `expo-dev-client` |
| Styling | NativeWind 4.2.7 (stable, Tailwind CSS 3, `inlineRem: 16`); tokens = web `globals.css` → `src/theme/tokens.ts` (`docs/MOBILE-UI.md`). v5 is RC — upgrade only as its own task |
| Icons / charts | `lucide-react-native` (+ `react-native-svg`) · `react-native-gifted-charts` |
| Motion | `react-native-reanimated` (respect `useReducedMotion`) |
| Images | `expo-image` |
| Glass / gradients | `expo-blur` + `expo-linear-gradient` |
| Fonts | `@expo-google-fonts/plus-jakarta-sans` + `@expo-google-fonts/manrope` |
| Secure storage | `expo-secure-store` (token, language) |
| Data | Own `api` / `useApi` / `usePaged` ported from the web repo — no React Query, SWR, Redux, Zustand |
| Tests | Maestro (one E2E runner) + `tsc --noEmit` + `npx expo-doctor` |
| Build | EAS Build profiles `development` / `preview` (APK) / `production` (AAB) |
| Later (own tasks) | `expo-notifications`, `expo-camera`, `expo-location`, `expo-updates` |
| Backend | `backend/`: Node.js + Express 5 + TS (`tsx`), zod 4, jsonwebtoken, bcryptjs, helmet · PostgreSQL 16 raw SQL via `pg`, migrations in `backend/migrations` · Docker Compose (`db`, `backend`) |

Backend origin: copied with its structure from the web repo `backend/` on 2026-11-06, plus the mobile additions (token in body for `X-Client: mobile`, `GET /public/app-version`). The web repo still runs its own copy: any backend change here that the web also needs → `WEB:` line in `TASKS.md`; one production API should serve both clients.

Folders: `src/app` · `src/features` · `src/shared/{ui,lib,i18n}` · `src/theme` · `assets/` · `backend/` · `.maestro/` · `app.config.ts` · `eas.json` · `docker-compose.yml`.

## Commands

| Goal | Command | Note |
|---|---|---|
| Local API | `docker compose up --build` | root; first start seeds demo data (minutes) |
| Backend dev | `npm run dev` (port 4000) | `backend/`, needs a PostgreSQL at `DATABASE_URL` |
| Dev server (Expo Go) | `npx expo start --go` → press `a` | Works while every native module is in Expo Go; emulator `Pixel_7` (`emulator -avd Pixel_7`) |
| Dev server (dev build) | `npx expo start` | After a dev build exists (`npx expo run:android` or EAS `development`) |
| Dev API on the web DB | `docker run -d --name tradeflow-mobile-api --network tradeflow_default -p 4002:4000 -e DATABASE_URL=postgres://tradeflow:tradeflow@db:5432/tradeflow -e SEED_DEMO=false tradeflow-mobile-api` | Shortcut while the web stack runs (no second DB/seed); `.env.local` → `http://10.0.2.2:4002/api/v1`. Rebuild after backend edits: `docker build -t tradeflow-mobile-api backend` |
| Bundle check | `npx expo export --platform android` | Compiles NativeWind + JS without an emulator |
| Run on Android | `npx expo run:android` | Emulator or USB phone; builds the development variant |
| Typecheck | `npm run typecheck` | `tsc --noEmit`, root and `backend/` |
| Doctor | `npm run doctor` | `npx expo-doctor` |
| E2E | `maestro test .maestro` | After `M3.1`; against the e2e stack only |
| Preview APK | `eas build -p android --profile preview` | Needs permit |
| Store AAB | `eas build -p android --profile production` | Needs permit |

## Env

| Variable | Value |
|---|---|
| `EXPO_PUBLIC_API_URL` (emulator) | `http://10.0.2.2:4000/api/v1` |
| `EXPO_PUBLIC_API_URL` (real phone, same Wi-Fi) | `http://<LAN-IP>:4000/api/v1` |
| `EXPO_PUBLIC_API_URL` (e2e) | `http://10.0.2.2:4101/api/v1` |
| `EXPO_PUBLIC_API_URL` (prod) | `https://api.<domain>/api/v1` |

Cleartext HTTP is allowed only in the development variant. Preview and production builds talk HTTPS only.
`EXPO_PUBLIC_*` values are baked into the bundle: never put a secret there.

## Forbidden additions

Second UI kit (React Native Paper, Tamagui, NativeBase, gluestack), CSS-in-JS libs (styled-components, emotion), state libs (Redux, Zustand, MobX, Jotai), data libs (React Query, SWR, Apollo), Jest / Detox, a WebView wrapper of the web app, Capacitor, Flutter, an ORM (Prisma / Drizzle) or a second backend framework — unless the user rewrites this lock.
