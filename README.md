# TradeFlow Mobile

React Native (Expo) app for TradeFlow — B2B distribution CRM (warehouses, stock, clients, orders, deliveries, payments, audits, field agents, leads, insights).

## Stack

- **App:** Expo SDK 58 · React Native · TypeScript strict · Expo Router · NativeWind 4
- **API:** Express 5 · zod · PostgreSQL 16 (`backend/`)
- **Target:** Android first (APK pilot → AAB), iOS later from the same code

Full lock and commands: [`docs/STACK.md`](docs/STACK.md). Architecture: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Local setup

1. Copy env: `cp .env.example .env.local` (app) and fill `backend` / compose secrets from `.env.example` into `.env` (never commit `.env` / `.env.local`).
2. API: `docker compose up --build` → `http://localhost:4000/api/v1`
3. App: `npm install` → `npx expo start`  
   Emulator API URL: `http://10.0.2.2:4000/api/v1` (`EXPO_PUBLIC_API_URL` in `.env.local`)

### Checks

```bash
npm run typecheck
npm run doctor
```

Backend: `cd backend && npm run typecheck`

### Demo logins

- `admin` / `admin123`
- Demo password `demo123`: `manager`, `courier1`…`courier3`, `auditor1`…`auditor2`, agents — see `backend/src/core/seed.ts`

## Docs

| Doc | Topic |
|---|---|
| [`AGENTS.md`](AGENTS.md) | Agent / contributor contract |
| [`docs/TASKS.md`](docs/TASKS.md) | Task queue |
| [`docs/MOBILE-UI.md`](docs/MOBILE-UI.md) | Screens, tokens, i18n |
| [`docs/BACKEND.md`](docs/BACKEND.md) | API modules |
| [`docs/TESTING.md`](docs/TESTING.md) | Maestro E2E |
| [`docs/RELEASE.md`](docs/RELEASE.md) | EAS / store |

## License

Proprietary — SeriusSoft. All rights reserved.
