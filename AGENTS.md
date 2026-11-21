# AGENTS.md

Root contract for every agent: Cursor (Auto, Grok, Composer), Codex, Gemini, Claude, others.
Pair: `AGENTS.md` + `CLAUDE.md` (same rules, Claude-specific hands). All other markdown lives in `docs/`.

## Project in 5 lines

TradeFlow Mobile — the React Native app of TradeFlow, a B2B distribution CRM (warehouses, stock, clients with credit limit, orders, deliveries, payments, audits, field agents, leads, insights).
Stack **LOCKED** (`docs/STACK.md`): Expo SDK 58 + React Native + TypeScript strict + Expo Router + NativeWind 4 (app in the repo root) · Express 5 + zod + PostgreSQL 16 (`backend/`, copied with its structure from the web repo). Android first (APK pilot → AAB Google Play), iOS later from the same code.
Web repo `/Users/amirxon/Desktop/tradeflow` (read-only) = the same product on the web: source of screens, copy, i18n keys, design. Never edit it from here.
Run: `docker compose up --build` → API `http://localhost:4000/api/v1`; then `npx expo start` (API from `EXPO_PUBLIC_API_URL`, emulator `http://10.0.2.2:4000/api/v1`).
Logins: `admin/admin123` · demo (`demo123`): `manager`, `courier1..3`, `auditor1..2`, agents from `backend/src/core/seed.ts`. Checks: `npm run typecheck` + `npm run doctor` (root), `npm run typecheck` (`backend/`). UI tests: `docs/TESTING.md`.

## Boot (every session)

1. Read this file. Voice = caveman (below). Hands = `docs/STRICT.md`.
2. `docs/ORCHESTRATION.md` → pick one `[ ]` in `docs/TASKS.md` (or the explicit user task) → mark `[~]`.
3. Route with `docs/skills/00-router.md` → open **one** domain file + at most **one** skill.
4. Grep → small reads → plan (`docs/skills/02-architect.md` for any new screen or write-path) → edit → verify → report.
5. Mark `[x]` (or `[!]` + reason). Stop.

## Read map

| Need | Open |
|---|---|
| Session flow, handoff | `docs/ORCHESTRATION.md` |
| What is allowed | `docs/STRICT.md` |
| Voice / report | `docs/CAVEMAN.md` + `.agents/skills/caveman/SKILL.md` |
| Stack lock, commands, env | `docs/STACK.md` |
| Modules, auth flow, role navigation, server rules | `docs/ARCHITECTURE.md` |
| Screens, tokens, fonts, i18n, a11y | `docs/MOBILE-UI.md` |
| API work (`backend/`) | `docs/BACKEND.md` |
| Tests (Maestro 3×3 matrix) | `docs/TESTING.md` + `docs/skills/04-ui-testing.md` |
| Speed, size, smooth lists | `docs/skills/03-performance.md` |
| Builds, stores | `docs/RELEASE.md` |
| Queue | `docs/TASKS.md` |

Do not open `MOBILE-UI.md` and `BACKEND.md` in one turn unless the task spans both (e.g. a new screen that needs a new endpoint).

## Skills

| Skill | Use when |
|---|---|
| `docs/skills/00-router.md` | Start of every task: map request → files |
| `docs/skills/01-caveman.md` | Always on: voice + report shape |
| `docs/skills/02-architect.md` | New screen, write-path, navigation entry, native capability |
| `docs/skills/03-performance.md` | Release build, cold start, list scroll, APK size |
| `docs/skills/04-ui-testing.md` | Any test task, any UI change that needs proof |
| `.agents/skills/caveman/SKILL.md` | Installed caveman voice (also `.claude/skills/caveman`) |

Installed skills live in `.agents/skills/<name>/SKILL.md` (Cursor, Codex) and are symlinked into `.claude/skills/` (Claude Code). Lockfile: `skills-lock.json`; restore with `npx skills experimental_install`. Open at most one per task, after the router.

| Installed skill | Source | Use when |
|---|---|---|
| `caveman` | JuliusBrussee/caveman | Always: chat voice |
| `baseline-ui` | ibelick/ui-skills | Any UI change: spacing, type, states baseline |
| `fixing-accessibility` | ibelick/ui-skills | Labels, roles, contrast, touch targets — apply as RN props (`accessibilityLabel`, `accessibilityRole`, `accessibilityState`, `testID`) |
| `frontend-design` | anthropics/skills | Public / welcome screens: art direction, type, layout plan |
| `design-taste-frontend` | leonxlnx/taste-skill | Polishing visual taste on public screens |
| `glassmorphism` | bergside/awesome-design-skills | Glass surfaces with `expo-blur` + `expo-linear-gradient` |
| `fixing-motion-performance` | ibelick/ui-skills | Janky `react-native-reanimated` motion, blur cost, dropped frames |
| `web-design-guidelines` | vercel-labs/agent-skills | Review only: compare a screen with the web interface rules |
| `penetration-testing-with-strix` | usestrix/strix | Security scan of `backend/` (needs permit: Docker + LLM key or Strix cloud) |
| `fix-security-vulnerabilities-with-strix` | usestrix/strix | Patch findings from a Strix report and re-run to prove the fix |

Web-only, kept for parity with the web repo, do not open: `playwright-cli`, `gsap-framer-scroll-animation`, `fixing-metadata`.

## Caveman (always on)

Chat replies follow `.agents/skills/caveman/SKILL.md` from the first message. Off only on `stop caveman` / `normal mode`.
Reply in the user's language (usually Uzbek). Code, docs, commits, comments: normal full prose — caveman is chat-only.
End every task with the report from `docs/CAVEMAN.md`: `Did` / `Files` / `Check` / `Next`.

## Hard rules

1. One session = one task. Fat chat → new session.
2. Prompt = allow-list. Undeclared git, install, EAS, store upload, Docker, secrets → `Need permit: <thing>.` Stop.
3. Staff code: app `src/app` thin routes → `src/features/<domain>` screens → `src/shared/{ui,lib,i18n}`; API `router → service → repository`. No extra layers, no drive-by refactor, no new package without permit.
4. Server rules in `docs/ARCHITECTURE.md` live in `backend/` only and never break; the phone never re-implements them: it shows the API 409/422 text as-is.
5. Done = typecheck green (root + `backend/` if touched) + `npx expo-doctor` clean + screen opens on the Android emulator + task Maestro rows green (3 states × 3 runs, `docs/TESTING.md`).
6. Never claim done without running the check. Can't run it → say so in `Check`.
7. Expo SDK changes fast: check docs.expo.dev for the installed SDK and run `npx expo-doctor` before using an API you remember.
