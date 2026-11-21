# Mobile UI

Expo Router + React Native + NativeWind. UI copy is written in **Uzbek (Latin)** and shown in 5 languages (`uz`, `uz-Cyrl`, `ru`, `en`, `ky`) — see "Languages" below. Expo SDK changes fast: check docs.expo.dev for the installed SDK before using an API you remember.

```
src/
  app/                    thin routes (Expo Router): screen options + one feature component
    (public)/             welcome flow (landing look), login
    (app)/                signed-in tabs per role + stack screens
  features/<domain>/      screens, sheets, forms
  features/public/        welcome sections + DemoForm (→ POST /public/leads)
  features/shell/         tab bar per role, More menu, header
  shared/ui/              Button, Field (Input/Select/Textarea), Card, Badge, States, Sheet, SearchSelect, PageHeader, KpiCard, Chips, SearchInput, Logo, Aurora, Glass
  shared/lib/             api (Bearer, x-lang, 401 → /login), useApi, usePaged (q debounce 300ms, status, infinite pages), format, status, roles
  shared/i18n/            config, translate, translit, messages (copied from source) + messages/mobile.ts
  theme/tokens.ts         design tokens (below), shared by NativeWind config and RN styles
```

## Tokens (copied exactly from source `frontend/src/app/globals.css`)

Live in `src/theme/tokens.ts` and the NativeWind theme. Never invent a colour outside this list.

| Token | Value |
|---|---|
| brand | 50 `#ecf8f2` · 100 `#d2efe0` · 200 `#a7dfc4` · 300 `#6fc8a1` · 400 `#3dae7f` · 500 `#1f9366` · 600 `#137852` · 700 `#0f6044` · 800 `#0e4c37` · 900 `#0c3f2e` · 950 `#062419` |
| ink | 50 `#f5f8f7` · 100 `#eaf0ee` · 200 `#d8e1de` · 300 `#b6c4bf` · 400 `#8a9b95` · 500 `#66776f` · 600 `#4b5b55` · 700 `#364540` · 800 `#1f2d29` · 900 `#13201c` |
| navy / sky | navy-500 `#2a4a6b` · navy-700 `#18324d` · navy-900 `#0f2236` · sky `#9cc3dc` |
| aurora (heading gradient) | `#32536b` → `#4f86ab` → brand-500 `#1f9366` · on dark: `#e3f0f8` → `#9cc3dc` → `#a6d48a` |
| shadow-soft | web `0 1px 2px rgb(16 40 32/.04), 0 4px 16px -4px rgb(16 40 32/.08)` → RN `shadowColor #102820`, `shadowOpacity .08`, `shadowRadius 8`, `shadowOffset {0,4}`, Android `elevation 2` |
| shadow-lift | web `0 2px 4px …/.04, 0 18px 40px -12px …/.18` → RN `shadowOpacity .18`, `shadowRadius 20`, `shadowOffset {0,12}`, Android `elevation 8` |
| radius | card 16 · shell / sheet 24 · icon 12 · input 12 |
| base | screen background ink-50 · text ink-900 · selection brand-200 / brand-950 · focus brand-500 |
| input | height 40 (touch area ≥ 48 with padding), radius 12, border ink-200, focused border brand-400 + ring brand-100, placeholder ink-400 |
| label | 12 px, semibold, ink-600, 6 px above the input |

Fonts: Plus Jakarta Sans (Latin) and Manrope for `ru`, `ky`, `uz-Cyrl` — the same switch as source `html:lang(ru|ky|uz-Cyrl)`. Loaded with `@expo-google-fonts/*`; the app waits for fonts before hiding the splash.

## Dashboard look (app screens = source `features/shell/Shell.tsx`)

- White cards: border ink-200 at 70%, shadow-soft, radius 16.
- Active item (tab, More row, chip): brand-50 background + brand-700 text + brand-500 indicator; inactive icon ink-400, text ink-600.
- Header: white at 80% with blur (`expo-blur`), date in ink-500, avatar circle gradient brand-400 → brand-700 with initials (`initials()` from `roles.ts`), logout icon.
- Insights promo card (More screen top): gradient brand-600 → brand-800, white text, "Aqlli agentlar faol", button white at 15%.
- Icons: the same `lucide` names as source Shell (`LayoutDashboard`, `Bot`, `ShoppingCart`, `Store`, `Users`, `Inbox`, `Warehouse`, `Package`, `Boxes`, `ClipboardCheck`, `Truck`, `Wallet`, `UserCog`, `History`, `Plug`, `LogOut`) via `lucide-react-native`.

## Public look (welcome + login = source landing)

- Light glass: white 70% → 40% linear gradient, border white 70%, `expo-blur` medium, inner top light line. Text on glass is ink-600 or darker (4.5:1).
- Aurora mist behind: navy / sky radial gradients (`expo-linear-gradient` layers or a pre-rendered image), green only as glow or status accent.
- Navy `#32536b` + sky `#9cc3dc` lead; headings use the aurora gradient (like `.text-aurora`).
- No space / galaxy motifs (stars, orbits, planets). Images from `assets/landing`.
- No heavy blur over long lists on Android (blur only on fixed surfaces: header, sheet, hero card).

## Patterns to copy

- List screen = `PageHeader` (title + primary action) → `Chips` (status) + `SearchInput` → `FlatList` of cards (no tables) → load more (`usePaged`) + pull to refresh.
- Create / edit = `Sheet` or modal stack screen with labelled `Field` inputs, limits matching the source zod schema, submit `Button disabled={saving}`, error text = `ApiError.message`.
- Detail screen = stack screen with back (header back + Android back button), e.g. `/(app)/orders/[id]`.
- Destructive / irreversible action = `Alert.alert` confirm with cancel + destructive buttons.
- Every async view handles **loading · empty · error** via `shared/ui/States` (error has "Qayta urinish").
- Role gating: hide actions the role cannot do (`allow()` list in `docs/ARCHITECTURE.md`); the API stays the final gate.

## Rules

- One UI kit (`src/shared/ui`). No component library. Icons `lucide-react-native`, charts `react-native-gifted-charts`, motion `react-native-reanimated` (respect `useReducedMotion`), images `expo-image`.
- Formatting only via `shared/lib/format` (money `so'm`, dates). Status labels / colours only via `shared/lib/status`.
- **Testability = accessibility**: every control has a visible label or `accessibilityLabel`; every interactive element has a `testID` and `accessibilityRole`; toggles set `accessibilityState` (`selected` / `checked` / `expanded`); touch targets ≥ 48 dp (`hitSlop` if the visual is smaller); contrast ≥ 4.5:1; font scaling up to 200% does not break layout; reduced motion respected. Maestro selects by text, label or `testID`, so a missing label is a bug.
- Keyboard: forms sit in `KeyboardAvoidingView` / scroll so the focused input and submit button stay visible; "next" moves between fields; "done" submits.

## Languages

- `shared/i18n` copied from the source: the Uzbek (Latin) text **is** the key. `t("Buyurtmalar")`, slots `t("bugun: {n}", { n })`. Code outside React (`api`, `format`): `tr()`.
- Dictionaries copied from source `frontend/src/shared/i18n/messages/*` — reuse the same Uzbek keys. Mobile-only text → `messages/mobile.ts` with `ru`, `en`, `ky`. `uz-Cyrl` is transliterated automatically (`cy` overrides for loanwords). Typecheck fails on a missing key.
- Default language is **`ru`**. The choice is stored in `expo-secure-store` (not a cookie); changing it re-renders the app and switches the font. `api()` always sends `x-lang`, so API errors come back in that language.
- Public copy (welcome flow) comes from source `features/landing/copy.ts`, kept separate from the dashboard dictionary.
- Data (product, client, warehouse, region names) is not translated. Money, dates, compact numbers follow the language via `format`.

## Layout targets

360 dp and 412 dp wide phones (Android 10+), safe areas (`react-native-safe-area-context`), Android back button on every stack screen, edge-to-edge status bar, keyboard-avoiding forms. Tablets later.

## UI change checklist

- [ ] Loading, empty, error states render.
- [ ] Labels / `accessibilityLabel` / `testID` on every new control.
- [ ] 360 dp and 412 dp layouts, font scale 1.0 and 2.0.
- [ ] New controls added to the matrix in `docs/TESTING.md`.
