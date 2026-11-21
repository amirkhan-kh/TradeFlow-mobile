# Testing

Runner: **Maestro** for UI / E2E on Android (iOS later, same flows) — one runner, no Jest / Detox. Static checks: `npm run typecheck` (`tsc --noEmit`) + `npm run doctor` (`npx expo-doctor`).
Procedure (loop until 100%): `docs/skills/04-ui-testing.md`. This file = rules + matrix.
API behaviour of `backend/` is covered by the web repo's Playwright API specs (same code). Here we test what the phone does with it; API changes made here get API rows below (happy · 401 · 403 · 422 · 409).

## When

| Task | What runs |
|---|---|
| Test task (`M3.1`, "test …") | Full matrix rows for the named scope, 3×3 rule, loop to 100% |
| Any UI change (after `M3.1`) | Matrix rows of the touched screen + `M-SHELL-*` rows, 3×3 rule |
| Any UI change (before `M3.1`) | typecheck + doctor + opens on the emulator; `Check` says "Maestro not set up" |
| Docs-only / copy-only | typecheck only |

## The 3×3 rule

Every matrix row (one function the user can trigger) is tested in **3 states**, and every flow runs **3 times**.

| State | Meaning | Typical inputs |
|---|---|---|
| **S1 — happy** | Valid action, expected result in UI **and** in data | Normal values, default role |
| **S2 — edge** | Boundary or unusual-but-valid | min/max (`0`, `1`, limit exactly), empty list, long text (120+), Uzbek apostrophes `O'g'il`, Cyrillic, 360 dp screen, font scale 2.0, Android back button, rotate / background + resume, second tap / toggle back |
| **S3 — negative** | Must be rejected or handled gracefully | Missing required, out-of-range, duplicate (409), rule break (409), wrong role (action hidden + 403), expired token (401 → login), network off (`setAirplaneMode`), double tap submit |

3 runs: each flow is executed 3 times in a row with no retries. A flow that passes 2/3 is **flaky = failed**.
Per row: 3 states × 3 runs = **9 green executions** minimum.

## Done bar (100%)

All must be true for the scope, else keep looping:

1. Every matrix row in scope has flows `.maestro/<screen>/<ID>-S1.yaml`, `-S2.yaml`, `-S3.yaml`, each tagged `[ID]` and `[Sn]` (coverage command below = expected count).
2. 3 consecutive runs of the scope → 0 failed, 0 flaky, 0 skipped.
3. No red-box / LogBox error, no crash, no unexpected 5xx in the run (the API helper fails the flow on 5xx).
4. Each S1 asserts the **data effect**, not just a toast: re-read via the API helper or pull to refresh.
5. `npm run typecheck` green, `npm run doctor` clean.

A real product bug found by a flow → fix it in the same task if it's inside scope (small diff); else `[!]` + new `TASKS.md` line (fix in `backend/` if the bug is in the API). Never weaken an assertion to make it pass.

## Setup (first test task `M3.1` creates this — standing permit in `docs/STRICT.md`)

```
.maestro/
  config.yaml            flows: "*/**" · executionOrder none · env defaults (API_URL, passwords)
  common/
    login.yaml           launchApp clearState → login as ${ROLE} → wait for the first tab
    logout.yaml
  scripts/
    api.js               http helpers (Maestro runScript): login, create warehouse/product/client/order with unique names, read back; fail on 5xx
    unique.js            Date.now() + run index suffix
  <screen>/<ID>-S<n>.yaml   one flow per row × state
```

Flow essentials:

```yaml
appId: tradeflow.app.dev
tags: ["[M-ORD-01]", "[S1]"]
env:
  ROLE: agent
---
- runFlow: ../common/login.yaml
- runScript: { file: ../scripts/api.js, env: { ACTION: createClient } }
- tapOn: { id: "orders-new" }
- assertVisible: "Yangi buyurtma"
```

Stack: flows create data, so they run on their **own** compose project — never on the main `:4000` stack or prod (needs permit outside `M3.1`):

```bash
API_PORT=4101 docker compose -p tradeflow-mobile-e2e up -d --build            # first start seeds (minutes)
docker compose -p tradeflow-mobile-e2e exec backend npm run verify:data        # data invariants, exit 1 on any break
docker compose -p tradeflow-mobile-e2e down -v                                 # throw the test data away
```

App under test: development build with `EXPO_PUBLIC_API_URL=http://10.0.2.2:4101/api/v1`. `api.js` refuses any URL with port `4000` or a non-local host.

## Writing rules

- **Selectors**: visible Uzbek text, `accessibilityLabel`, or `testID` (`id:` in Maestro). Missing label → add `accessibilityLabel` / `testID` in the component (that's an a11y fix). No coordinates, no index-only selectors.
- **Language**: flows set the app language to `uz` at login (`x-lang: uz` reaches the API too). Language checks live in `.maestro/i18n/`.
- **Data**: seed is random — never assert seeded values (except `admin` login). Each flow creates its own data via `scripts/api.js` with a unique suffix, so 3 runs never collide on UNIQUE columns.
- **Isolation**: no flow depends on another's order. `launchApp: { clearState: true }` at the start of each flow. One device, sequential runs (shared DB).
- **Waits**: `assertVisible` / `extendedWaitUntil` with a visible condition. Never fixed `waitForAnimationToEnd` loops as a sleep; never `- wait`.
- **Error states**: S3 network failure via `setAirplaneMode: enabled` (then `disabled` in the same flow); server errors via API state (e.g. over credit limit → 409), not mocks.
- **Dialogs**: `Alert.alert` confirms — test both the confirm and the cancel button.
- **Naming**: file `.maestro/orders/M-ORD-04-S3.yaml`, first comment line `# [M-ORD-04][S3] tasdiqlash: qoldiq yetmasa xato`.

## Commands

```bash
maestro test .maestro                                         # full suite, once
for i in 1 2 3; do maestro test .maestro/orders || break; done   # one screen, 3 runs
maestro test .maestro/orders/M-ORD-04-S3.yaml                 # one row × state
maestro test --include-tags "[M-ORD-04]" .maestro             # one row, all states
maestro studio                                                # inspect the hierarchy (labels, testIDs)
# coverage: rows × states present
ls .maestro/*/*-S[123].yaml | rg -o "M-[A-Z0-9]+-[0-9]+-S[123]" | sort -u | wc -l
```

## Matrix

ID → function → what S1 / S2 / S3 must prove. **Every row = 3 states × 3 runs.** Rows below are the starting set (written in `M0.1`); each screen task adds or sharpens rows for its controls.

### L — list contract (apply to every list screen: ORD, CLI, DEL, PAY, STK, AUD, LEAD)

Each screen gets its own copies: `M-ORD-L1`, `M-CLI-L1`, …

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| L1 | Search | Match by name → only matching cards | No match → `Empty`; apostrophe / Cyrillic / spaces; clear → full list | Type fast + clear before 300 ms → one final request, list starts from page 1 |
| L2 | Status Chips | Each option filters; selected chip `accessibilityState.selected` | Back to "Barchasi" | Chip change after loading page 2 → list restarts from page 1 |
| L3 | Load more + pull to refresh | Scroll to end → next page appended, no duplicates | Last page → no more requests; single page → no loader | Pull to refresh after a new item created via API → item on top |
| L4 | States | Loading indicator then cards | Empty dataset → `Empty` text | Airplane mode → error state + "Qayta urinish" recovers after network back |

### M-AUTH — login (P0)

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-AUTH-01 | Login submit | `admin/admin123` → first tab of admin; token survives app restart | Each role (`manager`, `courier1`, `auditor1`, an agent) with `demo123` → its own tabs; keyboard "done" submits | Wrong password → API error text; empty fields → button disabled; button disabled while loading |
| M-AUTH-02 | Show/hide password | Toggle → text visible, label "Parolni yashirish" | Toggle back → hidden | Toggle does not submit |
| M-AUTH-03 | Lockout and blocked | — correct login after a single failure works | Error text keeps the minutes from the API | 5 failures → 429 text; blocked user → 403 "bloklangan" text |
| M-AUTH-04 | Session end | Logout → login screen, token gone (restart stays logged out) | Android back after logout does not reopen tabs | Token revoked via API (`sessions/revoke`) → next request → login screen |
| M-AUTH-05 | App-version gate | Version ≥ `min` → app opens | Below `latest` → soft banner, app usable | Below `min` → blocking update screen, no tabs reachable |

### M-SHELL — tabs, More, header (P0)

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-SHELL-01 | Tabs per role | Each role sees exactly its tabs (`docs/ARCHITECTURE.md`) | Tab switch keeps each tab's scroll / stack | Role without a screen: no tab, no More row, deep link → "ruxsat yo'q" state |
| M-SHELL-02 | More menu | Every row opens its screen | Admin-only rows open the web dashboard URL | Non-admin: admin rows hidden |
| M-SHELL-03 | Header | Avatar initials + name + role label | Long name truncates, no overlap at 360 dp | `/auth/me` error → header still usable, retry on next focus |
| M-SHELL-04 | Android back | Stack screen → back to list | Back on first tab → app goes to background (no crash) | Back while a sheet is open → sheet closes first |

### M-PUB — welcome flow (P1)

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-PUB-01 | Demo form | Valid name + phone → success; lead visible via API (`GET /leads` as manager) | Only required fields; long company / message; `O'g'il` name | Empty required → no request; airplane mode → error text; double tap → 1 lead |
| M-PUB-02 | "Kirish" + sections | "Kirish" → login screen | Scroll all sections at 360 dp, images load | Back from login → welcome screen, scroll kept |
| M-PUB-03 | Language picker | Pick English → welcome texts English, stored after restart | All 5 languages: Cyrillic ones switch to Manrope | Unknown stored value → Russian (default) |
| M-PUB-04 | FAQ accordion | Tap opens answer, `expanded` state | Open second item | 3 fast taps → final state correct |

### M-DASH — dashboard + insights (P1)

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-DASH-01 | KPI cards | Cards render numbers in current language format | Values change after creating an order via API (pull to refresh) | Airplane mode → error state + retry |
| M-DASH-02 | Charts | Render with data | Empty range → no crash | Rotate / 360 dp → no overflow |
| M-DASH-03 | Insights | 5 agent cards, findings with severity badge | Finding tap → navigates to its screen | API error → error state + retry |

### M-ORD — orders (P0) + `M-ORD-L1..L4`

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-ORD-01 | New order (client, warehouse, product pickers) | 1 line → created, status `new`, total correct (API re-read) | 3 lines; same product twice → merged qty; discount `0` and `50` | Discount `51` blocked; no product; qty `0`; double tap → 1 order |
| M-ORD-02 | Pickers (SearchSelect) | Server search returns ≤ 20 rows, pick sets the field | Cyrillic / apostrophe search; closed warehouse not offered | No match → empty text; airplane mode → error in picker |
| M-ORD-03 | Credit limit | Within limit → created | `balance + total == limit` → allowed | Over limit → 409 text shown as-is, order not created |
| M-ORD-04 | Confirm (manager) | `confirmed`, stock reserved (API re-read) | Order using all available stock | Not enough stock → 409 text, status stays `new` |
| M-ORD-05 | Ship (manager, courier) | `shipped`, delivery created | Courier role sees ship only where allowed | Cancel sheet → still `confirmed`; double tap → one movement |
| M-ORD-06 | Deliver / cancel | Delivered → `delivered`; cancel from `new` → `cancelled` | Cancel from `confirmed` → reserve released | `Alert` cancel button → no change; agent role: no status buttons |

### M-CLI — clients (P0) + `M-CLI-L1..L4`

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-CLI-01 | Create (manager, agent) | Valid → card appears (API re-read) | Segment A/B/C; limit `0` (= unlimited); no agent | Required empty; limit `-1` blocked; 422 text shown |
| M-CLI-02 | Detail | Card tap → balance, orders, payments | Android back → list, scroll kept | Unknown id → not-found state |
| M-CLI-03 | INN lookup | Didox on → fields filled | 14-digit INN accepted | 5 digits blocked; Didox off → 409 text |
| M-CLI-04 | Edit (manager only) | Change limit → saved | Agent: edit hidden | Clear required → blocked |

### M-DEL — deliveries (P1, courier + manager) + `M-DEL-L1..L4`

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-DEL-01 | Status update | pending → on_route → delivered; order becomes `delivered` (API re-read) | Failed with note | Terminal state → no buttons; airplane mode → error, status unchanged |
| M-DEL-02 | Call client | `tel:` opens dialer with the client phone | Phone with spaces / `+998` prefix → dialer gets digits only | No phone → button hidden |
| M-DEL-03 | Open map | `geo:` intent with address | Address with apostrophe / Cyrillic encodes correctly | No address → button hidden |

### M-PAY — finance (P0) + `M-PAY-L1..L4`

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-PAY-01 | Payment form (client, amount, method, note) | Cash → row + client balance down (API re-read) | Each method: cash, card, transfer; amount `1` | Amount `0` / negative blocked; no client; double tap → 1 payment |
| M-PAY-02 | Payme / Click link share | Share sheet opens with the checkout URL | Amount = debt prefilled | No payment integration → API text; amount < 1000 blocked |
| M-PAY-03 | Method chips | Filter by method | "Barchasi" | Method with no payments → `Empty` |

### M-STK — stock, products, warehouses (P1) + `M-STK-L1..L4`

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-STK-01 | Stock list | Warehouse filter + low-stock toggle | Toggle back → all | Warehouse with no stock → `Empty` |
| M-STK-02 | Movement in / out / transfer (manager) | Quantity changes, movement row (API re-read) | Remove exactly all available → `0` | More than available → 409 text, unchanged; same warehouse transfer → 422 text |
| M-STK-03 | Products / warehouses read | Lists and details render for every role that can open them | Long names wrap at 360 dp | Non-manager: create / edit hidden |

### M-AUD — audits (P0) + `M-AUD-L1..L4`

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-AUD-01 | New audit (manager, auditor) | Created `in_progress` | Warehouse with 1 product | No warehouse → blocked |
| M-AUD-02 | Count entry | Counts saved (API re-read) | Fill expected; search items; `0` count | Negative blocked; completed audit → inputs disabled |
| M-AUD-03 | Complete | All counted → `completed` | Counts equal expected → variance `0` | Uncounted → 422 text |
| M-AUD-04 | Approve (manager) | `approved`, stock = counted | Shortage and surplus → variance sign | `Alert` cancel → still `completed`; auditor: approve hidden |

### M-LEAD — leads, agents (P2) + `M-LEAD-L1..L4`

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-LEAD-01 | Lead status | new → contacted persists after refresh | Each value: new, contacted, won, lost | Airplane mode → error, value reverts |
| M-LEAD-02 | Agents KPIs | Cards with plan % | Agent with plan `0` → no divide error | API error → error state |

### M-PRF — profile (P1)

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-PRF-01 | Profile edit | Save name → header updates | Long name; Cyrillic | Bad email → 422 text |
| M-PRF-02 | Password change | Correct current + new → new token stored, old token 401 (API) | Show / hide toggles; mismatch disables submit | Wrong current → 422 text; same as current → 409 text |
| M-PRF-03 | My activity | Own logins listed | Load more | API error → error state |

### M-I18N — languages (P1)

| ID | Function | S1 | S2 | S3 |
|---|---|---|---|---|
| M-I18N-01 | Language switch in More | Russian → tabs, headers, badges, money format translated; persists after restart | All 5 languages; Cyrillic → Manrope | Unknown stored value → Russian |
| M-I18N-02 | API messages | Wrong password in English → English API error | `uz-Cyrl` → Cyrillic error text | 409 credit-limit text in the chosen language |

## Report

```
Check: 3 runs of .maestro/<scope> → <passed>/<total> passed · flaky 0 · skipped 0
Coverage: <ids×states found>/<expected> (coverage command above)
Bugs: <fixed in this task> · <new TASKS lines>
```
