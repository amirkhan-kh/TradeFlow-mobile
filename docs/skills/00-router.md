# 00 router

Map the request to **one** domain file + **≤ 1** skill. Then work. Then stop.

## Inputs

User prompt · `docs/TASKS.md` · touched paths (if user named files).

## Route table

| Request smells like | Domain file | Skill | Scope folders |
|---|---|---|---|
| screen, form, sheet, button, list, layout, copy, chart | `MOBILE-UI.md` | `02-architect` if new screen / write-path | `src/features/<d>`, `src/app/**`, `src/shared/ui` |
| api client, token, 401, x-lang, cache, pagination | `ARCHITECTURE.md` | — | `src/shared/lib`, `src/shared/i18n` |
| new screen end-to-end (API contract + UI) | `ARCHITECTURE.md` (+ `MOBILE-UI.md`, `BACKEND.md` allowed) | `02-architect` | `src/features/<d>`, `src/app/**`, `backend/src/modules/<d>` |
| role, tabs, More menu, navigation | `ARCHITECTURE.md` | — | `src/features/shell`, `src/app/(app)/_layout.tsx` |
| test, QA, bug repro, "check it works", regression | `TESTING.md` | `04-ui-testing` | `.maestro` |
| welcome / public screens, glass, aurora | `MOBILE-UI.md` | `frontend-design` or `glassmorphism` (installed) | `src/features/public`, `assets/landing` |
| speed, cold start, jank, APK size | `MOBILE-UI.md` | `03-performance` (+ `fixing-motion-performance` for motion) | touched screen, `app.config.ts` |
| accessibility, labels, contrast, font scale | `MOBILE-UI.md` | `fixing-accessibility` (installed, as RN props) | touched screen, `src/shared/ui` |
| build, EAS, icon, splash, store, version | `RELEASE.md` | — | `app.config.ts`, `eas.json`, `assets/brand` |
| endpoint, SQL, migration, 409/422, role, transaction | `BACKEND.md` | `02-architect` if new write-path | `backend/src/modules/<d>`, `backend/migrations` |
| security scan, pentest | `BACKEND.md` | `penetration-testing-with-strix` (installed, needs permit) | read-only until permit |
| local API, Docker, env, deploy of the API | `STACK.md` | — | `docker-compose*.yml`, `backend/Dockerfile`, `Caddyfile` |
| "what is this project", explain | `ARCHITECTURE.md` | — | read-only |
| shorter answers, tone | `CAVEMAN.md` | `01-caveman` | — |
| stack / framework question | `STACK.md` | — | read-only (never switch) |

Bug report without a test? Route to `TESTING.md` + `04-ui-testing`: write the failing S3 flow first, then fix (once `M3.1` exists).

## Steps

1. Pick the row. Ties → the one owning the data (backend beats the app for rule bugs).
2. Write: `Scope: <folders> · Check: <command>`.
3. Find the target fast: `rg "<Uzbek UI label>" src` for UI; the same label in the source `frontend/src/features/<d>` for the web version; `rg "<route path>" backend/src` for the API contract.
4. Out-of-scope need → `Need permit:` (`docs/STRICT.md`).
5. After report → stop. Leftovers → new `TASKS.md` line, not more work.
