# STRICT

Prompt = allow-list. Default deny. Hands only — voice is `docs/CAVEMAN.md`.

## Always OK

- Read anything in this repo and in the web repo `/Users/amirxon/Desktop/tradeflow` (read-only).
- Edit files inside the task `Scope`.
- Update the task line in `docs/TASKS.md`.
- Run read-only / local checks: `npm run typecheck` (root, `backend/`), `npm run doctor` (`npx expo-doctor`), `npx expo export --platform android` (bundle check), the Maestro command named by the task, `git status`, `git diff`.
- Commands the user typed verbatim.

## Need permit

| Area | Examples |
|---|---|
| Git writes | `commit`, `push`, branch, PR, rebase, reset, stash |
| Packages | `npm install <pkg>`, `npx expo install <pkg>`, SDK upgrade, version bumps, lockfile churn |
| Deletes / renames | Delete files, rename routes, API paths, DB columns, change `android.package` / `ios.bundleIdentifier` |
| Infra | `docker compose up/down -v`, SSH, deploy, prod migrate, DB reset, EAS Build, EAS Submit, store uploads, OTA publish |
| Secrets | `.env*`, `eas.json` credentials, keystores, Apple / Google keys, `JWT_SECRET`, `google-services.json` |
| Scope creep | Extra screens/docs, repo-wide format, new lint rules, drive-by refactor |
| External | Network calls that change remote state, push notifications to real devices, emails, webhooks |
| Web repo | Any edit in `/Users/amirxon/Desktop/tradeflow` — write a `WEB:` line in `TASKS.md` instead |

Format: `Need permit: <thing> — <why, 1 line>.` Stop this turn.

## Standing permits (task text grants them)

A task line or user prompt that names the thing grants it for that session only:

- "tests" / task `M3.1` → may install Maestro CLI, create `.maestro/**`, run the e2e compose stack (`API_PORT=4101 docker compose -p tradeflow-mobile-e2e up -d --build`), `npx expo run:android` against it.
- "release" / tasks `M4.*`, `M6.*` → may run the EAS commands named in the task; the user types every login and confirms every submit in chat first.
- "performance" / task `M3.2` → may build and run the release variant on the emulator (`npx expo run:android --variant release`).

## Never (even with permit, ask twice)

- `docker compose down -v` on a DB with real data.
- Force-push to `main`.
- Commit secrets, keystores or real customer data.
- Point a test run at the main `:4000` stack or prod.

Unclear → one question. No "better" substitute command. No silent workaround around a denied step.
