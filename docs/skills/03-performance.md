# 03 performance

Bar on every release build: cold start **< 2 s** on a mid Android phone (or the emulator profile of one), **60 fps** list scroll, no dropped frames on screen transitions, APK size reported.
Dev builds are not measured — always the release variant.

## Checklist

**Start** — Hermes on (Expo default; never turn it off). Fonts and the token check run in parallel before the splash hides; nothing else blocks the first screen. No large JSON or dictionaries imported eagerly that the first screen does not use. `useApi` cache renders the last data at once on revisit.

**Lists** — `FlatList` (or `FlashList` only with a permit) with `keyExtractor` on the stable API id, stable item height (`getItemLayout` when the height is fixed), `initialNumToRender` ≈ one screen, memoized row components, no inline anonymous objects in hot props. Load more with `onEndReached` + `usePaged`, never fetch everything.

**Images** — `expo-image` with explicit width/height, `contentFit`, `cachePolicy` default, right-sized assets (`assets/landing` webp). No full-screen PNG backgrounds.

**Motion** — `react-native-reanimated` on the UI thread, transform / opacity only, respect `useReducedMotion`. No `expo-blur` over scrolling lists on Android; blur only on fixed surfaces (header, sheet, hero card).

**Bundle** — no unused packages, no web-only packages, icons imported by name from `lucide-react-native` (tree-shaken), charts lazy on the screens that need them.

**Network** — 30 s timeout in `api`, one request per screen focus (no request waterfalls when the API can return it in one), debounce search 300 ms.

## Run (task `M3.2` or "performance" in prompt = permit)

```bash
npx expo run:android --variant release                       # release build on the emulator / phone
adb shell am force-stop tradeflow.app.dev && adb shell am start -W -n tradeflow.app.dev/.MainActivity   # TotalTime = cold start ms (adjust package for the variant)
adb shell dumpsys gfxinfo tradeflow.app.dev reset && <scroll the longest list 10 s> && adb shell dumpsys gfxinfo tradeflow.app.dev   # Janky frames %
ls -lh android/app/build/outputs/apk/release/*.apk           # APK size
```

Measure 3 times; report the median. A target missed → fix that screen only, rerun 3×.

## Report

`Check: release build · cold start <ms> (median of 3) · janky frames <n>% on <list> · APK <MB>` — or the failing target and its cause.
