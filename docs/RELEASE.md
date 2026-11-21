# Release

Only when the prompt asks (tasks `M4.*`, `M6.*` or "release"). Otherwise `Need permit: release`.
Builds run in the EAS cloud (no Mac needed for iOS). The user types every `eas login` / Apple login in the terminal and confirms every submit in chat first. Credentials stay in EAS — never in the repo or chat.

## Identity

| Field | Value |
|---|---|
| App name | `TradeFlow` (confirmed 2026-11-06) |
| `android.package` | `tradeflow.app` (confirmed 2026-11-06; cannot change after the first Play upload) |
| `ios.bundleIdentifier` | same id `tradeflow.app` |
| Variants | `development` → `tradeflow.app.dev` (cleartext HTTP allowed) · `preview` / `production` → `tradeflow.app` (HTTPS only) |
| Version | `version` (semver) in `app.config.ts`; `android.versionCode` / `ios.buildNumber` via EAS `autoIncrement` (remote app version source) |

## `eas.json` profiles

| Profile | Output | Distribution | `EXPO_PUBLIC_API_URL` |
|---|---|---|---|
| `development` | dev client APK | internal | LAN / emulator URL |
| `preview` | APK | internal (link for pilot phones) | demo or prod HTTPS API |
| `production` | AAB (Android) / IPA (iOS) | store | prod HTTPS API |

After every store release, bump `MOBILE_ANDROID_LATEST` / `MOBILE_IOS_LATEST` on the API host; raise `*_MIN` only when an old build must stop working (source task 4.5, `GET /public/app-version`).

## Android (first)

1. Pilot: `eas build -p android --profile preview` → APK link → install on 3 real phones (Android 10+), check login per role, one order flow, payments, deliveries.
2. Google Play Console account ($25, once). Personal account: **closed testing with 12 testers for 14 days** before production. Organisation account (D-U-N-S) has no such rule.
3. Play App Signing on (EAS uploads the upload key; Google holds the app signing key).
4. `eas build -p android --profile production` → AAB → `eas submit -p android` (user confirms first) to the closed testing track.
5. Store listing in uz / ru / en: icon 512×512, feature graphic 1024×500, ≥ 2 phone screenshots, short + full description.
6. Privacy policy URL: a public page on the web site (`/privacy`) — own `WEB:` task in the web repo.
7. Data safety form: account data (name, phone, username), location only if `expo-location` ships, no ads, data encrypted in transit, account deletion by the company admin.
8. Content rating questionnaire; target audience 18+ (business app).
9. Review access: demo account on a **demo instance** (`SEED_DEMO=true`, no real data), credentials in Play "App access".
10. Production rollout after the closed test passes (staged rollout 20% → 100%).

## iOS (a few weeks after Android)

1. Apple Developer Program ($99/year). `bundleIdentifier` = the same id.
2. `eas credentials` (user logs in to Apple) → `eas build -p ios --profile preview` → internal TestFlight.
3. QA on iPhone SE (small screen) and a large iPhone: safe areas, keyboard, swipe-back, Dynamic Type.
4. Permission strings in `app.config.ts` (`NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`) only for features that ship, in clear user language.
5. App Privacy labels match the Play Data safety answers.
6. Export compliance: HTTPS only (standard encryption) → `ITSAppUsesNonExemptEncryption = false`.
7. Review notes: B2B app for distribution companies; accounts are created by the company admin (no self sign-up, no account creation in the app); demo login on the demo instance; screens are native (not a WebView wrapper, guideline 4.2).
8. `eas submit -p ios` (user confirms first) → review → release.

## Pre-flight (all must be true)

- [ ] `npm run typecheck` green, `npm run doctor` clean.
- [ ] Maestro done bar green on the release commit (`docs/TESTING.md`), 3 runs.
- [ ] `docs/skills/03-performance.md` targets met on the release build (cold start, scroll, APK size reported).
- [ ] `EXPO_PUBLIC_API_URL` of the profile is HTTPS; cleartext disabled outside `development`.
- [ ] No secret in `EXPO_PUBLIC_*`, `app.config.ts` or the repo; keystore and Apple keys only in EAS.
- [ ] Source API host: `MOBILE_*` versions set, `/public/app-version` returns them, `/health` OK.
- [ ] Demo instance for store review is up, demo credentials work, no real data on it.
- [ ] Icon, adaptive icon, splash from `assets/brand` in brand colours; app name and package id as confirmed.
- [ ] Privacy policy URL live; Data safety / App Privacy filled; listing texts in uz / ru / en.

## Rollback

Android: halt the staged rollout in Play Console, ship the previous build with a higher `versionCode`. iOS: remove from sale or expedite a fix build. Raise `*_MIN` on the API only if the broken build must be blocked. OTA updates (`expo-updates`) come later in `M5.1d`.
