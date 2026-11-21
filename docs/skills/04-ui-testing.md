# 04 UI testing — loop to 100%

Rules and matrix: `docs/TESTING.md`. This skill = the procedure. Do not stop until the Done bar is met or a stop condition hits.

## 0. Prepare (once per repo)

1. `.maestro/config.yaml`, `.maestro/common/login.yaml`, `.maestro/scripts/api.js` exist? If not, create per `TESTING.md` → Setup (standing permit for test tasks).
2. Stack up: `curl -fs http://localhost:4101/health` OK, else start `API_PORT=4101 docker compose -p tradeflow-mobile-e2e up -d --build` (background) and poll. Never test on the main `:4000` stack.
3. App: development build on the emulator with `EXPO_PUBLIC_API_URL=http://10.0.2.2:4101/api/v1` (`npx expo run:android`).
4. Smoke: `maestro test .maestro/auth/M-AUTH-01-S1.yaml` green before writing more.

## 1. Inventory the scope

1. Pick screens from the task (or the touched screen).
2. List every interactive control in it — nothing is "too small":
   `rg -n "onPress|onChangeText|onSubmitEditing|onValueChange|onRefresh|onEndReached|Linking\.|Alert\.alert|testID|accessibilityLabel" src/features/<d>`
3. Every control must map to a matrix row in `TESTING.md`. Missing → add a row (ID, S1, S2, S3) first.
4. Expected count = rows × 3. Write it down.

## 2. Write flows — one row at a time

For each row, three flows: `<ID>-S1.yaml`, `<ID>-S2.yaml`, `<ID>-S3.yaml`.

- Arrange via `scripts/api.js` (API, unique names). Never via seeded data.
- Act like a user: tap by text / label / `testID`, type, scroll, Android back.
- Assert UI **and** data (API re-read via `api.js` or pull to refresh). S3 also asserts that nothing changed.
- Network failure with `setAirplaneMode`; dialogs: tap confirm in one flow and cancel in another.

## 3. Run → triage → fix → rerun

```
run   for i in 1 2 3; do maestro test .maestro/<screen> || break; done
red?  read the Maestro output + screenshot in ~/.maestro/tests/<run>/ → classify:
        test bug      → fix the flow (selector, visible-condition wait, data)
        product bug   → keep the failing flow, fix the code (smallest diff in scope); API bug → fix in `backend/`
        flaky (≤2/3)  → find the race (missing wait-for-visible, debounce, shared data); never add retries or sleeps
        env           → stack down / emulator offline / wrong API URL → fix env, rerun
rerun the same screen until 3/3 runs green · 0 flaky
```

Flake hunt for any flow that was ever red: run it 10 times in a row (`for i in $(seq 10); do maestro test <flow> || break; done`) — must be 10/10.

## 4. Gate

1. Full scope: 3 consecutive runs → 0 failed, 0 flaky, 0 skipped.
2. Coverage: `ls .maestro/*/*-S[123].yaml | rg -o "M-[A-Z0-9]+-[0-9]+-S[123]" | sort -u | wc -l` = expected count.
3. `rg -n "^- wait|retry:|waitForAnimationToEnd" .maestro` → no hits used as sleeps or retries.
4. `npm run typecheck` green, `npm run doctor` clean.
5. Not all true → back to step 2/3. **Loop.**

## Stop conditions

- Gate green → report (`TESTING.md` → Report), mark `[x]`.
- Same failure 3 iterations, same root cause, no new hypothesis → `[!]` + handoff in `TASKS.md`.
- Fix needs out-of-scope change (other screen, migration, new package) → `Need permit:`.
- Context nearly full → handoff line with last green row ID, continue in a new session.

## Anti-patterns (reject in review)

Fixed sleeps · `retry` blocks · skipping a flow to go green · coordinate taps · asserting only a toast · flows sharing data · editing the assertion to match a bug · one giant flow covering many rows · running against `:4000` or prod.
