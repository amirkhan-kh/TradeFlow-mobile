# Architecture

Smallest correct cut. One truth per fact. Same domain name on API, mobile feature folder, and route.

## Shape

```
phone (Expo app, repo root) ──HTTPS──> Express (backend/, :4000) /api/v1 ──pg──> PostgreSQL
  src/app (thin routes, Expo Router)        app.ts → modules/<domain>/router
  src/features/<domain> (screens, sheets)   router → service → repository → db
  src/shared/{ui,lib,i18n} · src/theme      core/ (auth, db, http, config, i18n, seed)
```

`backend/` was copied with its structure from the web repo (`/Users/amirxon/Desktop/tradeflow`, read-only) and is the API of this app. The web repo remains the reference for screens, copy, i18n keys and design.

## Auth

1. `POST /auth/login` with header `X-Client: mobile` → `body.token` (same JWT as the `tf_token` cookie: 7 days, claim `v`). Without the header the body has no token — the web flow is unchanged.
2. Token → `expo-secure-store`. Every request: `Authorization: Bearer <token>` + `x-lang: <lang>`. No cookies.
3. `401` on any request except `/auth/login` → drop the token, clear the `useApi` cache, go to `/login`. `token_version` revocation (role change, block, password reset, "sessiyalarni yopish") works by itself: the next request returns 401.
4. `POST /auth/me/password` with `X-Client: mobile` returns the new token → store it (the old one is now revoked).
5. Logout = drop the token locally (+ `POST /auth/logout`, result ignored). No server change.
6. App start: `GET /public/app-version` (`{ android: { min, latest }, ios: { min, latest } }` from env `MOBILE_*`, `core/config.ts`) → below `min` for the platform → blocking "update" screen; below `latest` → soft banner.
7. Login lockout (5 failures per username + IP → 429 for 15 min) and blocked account (403) texts come from the API.

## Server rules (never re-implemented here)

Copied verbatim from the web repo `docs/ARCHITECTURE.md` → "Invariants"; enforced in `backend/` (rules in `service.ts`, SQL in `repository.ts`, `docs/BACKEND.md`). The phone shows API 409/422 text as-is (already translated by `x-lang`); it never decides stock, credit limit or state transitions; it only previews totals.

1. **Stock**: `quantity >= 0`, `0 <= reserved <= quantity` (DB CHECK). Every change writes `stock_movements`. `idempotency_key` makes a retried move a no-op.
2. **Order state machine**: `new → confirmed | cancelled`, `confirmed → shipped | cancelled`, `shipped → delivered`. Terminal: `delivered`, `cancelled`.
   - `confirmed` reserves stock · `cancelled` from `confirmed` releases it · `shipped` consumes reserve, writes `out` movement, adds `total` to client balance, creates delivery · `delivered` marks delivery.
3. **Credit limit**: create order rejected (409) if `credit_limit > 0` and `balance + total > credit_limit`.
4. **Payment**: `amount > 0`, lowers client balance, same transaction.
5. **Audit**: `in_progress → completed` (all items counted) `→ approved` (stock set to counted, `adjust` movements). Completed audit is immutable.
6. **Money**: `NUMERIC(14,2)`, round to 2 decimals in service, never float-compare in SQL.
7. Multi-row writes run in `tx()` with `SELECT … FOR UPDATE` on the row that guards the rule.
8. **Integrations outbox**: domain writes call `emit(db, event, build)` inside their transaction → one `integration_jobs` row per subscribed active integration. Worker (`integrations/worker.ts`, 5s tick, `SKIP LOCKED` lease) delivers with backoff 30s→1h, max 8 attempts → `failed` (manual retry). Never call a remote API inside a domain transaction.
9. **Integration secrets**: `password`-type config fields are AES-256-GCM encrypted (`SECRET_KEY`, fallback `JWT_SECRET`) and returned as `********`; empty/masked value on update keeps the old secret. Inbound URLs authenticate by the 48-hex `token` (rotatable); inactive → 404.
10. **Staff management**: at least one active admin always remains (active admins locked `ORDER BY id FOR UPDATE` before the target row); an admin cannot block self or change own role. Every login, failed login/lock, profile, password and staff change writes `activity_log` in the same transaction.
11. **References**: an assigned agent / courier / auditor must be an active user in that role (`assertAssignee`, 422; an unchanged assignee on edit is kept even if later blocked). Deactivated warehouses keep history but take no new orders, stock-in or transfers in (422); pickers request `?active=true`. Unknown foreign key → 422, never 500. `npm run verify:data` (backend) checks these links plus the stock, reserve and balance ledgers.

Writes from the phone: submit disabled while in flight, no automatic retry of `POST` / `PATCH` / `PUT` (payments are not idempotent yet). Network failure after send → show the error and let the user re-check the list before trying again.

## Module map (`backend/src/modules/` ↔ `src/features/` ↔ route)

| Domain | API | Mobile route | Writes from the phone | Roles that write |
|---|---|---|---|---|
| auth | `/auth/*` | `/login`, `/profile` | login, profile, password | all |
| app | `/public/app-version` | (app start) | — | — |
| dashboard | `/dashboard` | `/(app)/dashboard` | — | — |
| insights | `/insights` | `/(app)/insights` | — | — |
| orders | `/orders` | `/(app)/orders`, `/[id]` | create, status | create: manager, agent · status: manager, courier |
| clients | `/clients` | `/(app)/clients`, `/[id]` | create, INN lookup, edit | create/lookup: manager, agent · edit: manager |
| deliveries | `/deliveries` | `/(app)/deliveries` | status | manager, courier |
| payments | `/payments` | `/(app)/finance` | create, share link | manager, agent, courier |
| stock | `/stock` | `/(app)/stock` | in / out / transfer | manager |
| products | `/products` | `/(app)/products` | create, edit | manager |
| warehouses | `/warehouses` | `/(app)/warehouses` | create, edit | manager |
| audits | `/audits` | `/(app)/audits`, `/[id]` | create, counts, complete · approve | manager, auditor · approve: manager |
| agents | `/agents` | `/(app)/agents` | — (KPIs) | — |
| leads | `/public/leads`, `/leads` | public demo form, `/(app)/leads` | public create, status | any signed-in role |
| users, integrations, activity | admin only | — (web dashboard link) | — | admin |

`admin` passes every `allow(...)` check. Hide actions the role cannot do; the API stays the final gate (403).

## Role → navigation

| Role | Tabs |
|---|---|
| agent | Dashboard · Orders · Clients · Payments · More |
| courier | Deliveries · Orders (read + ship/deliver) · Payments · More |
| auditor | Audits · Stock (read) · More |
| manager, admin | Dashboard · Orders · Stock · Finance · More |

More = deliveries, audits approve, clients, products, warehouses, leads, agents KPIs, insights, profile, language, logout (each entry only when the role can open it).
Admin-only web screens (staff, integrations, activity log) stay on the web: More shows a row that opens the web dashboard URL (`Linking.openURL`).

## Boundaries

- Route file (`src/app/**`) = screen options + one feature component. Logic in `src/features/<domain>`.
- `src/shared/ui` = dumb primitives (Button, Field, Card, Badge, States, Sheet, SearchSelect, PageHeader, KpiCard, Chips, SearchInput, Logo, Aurora, Glass). `src/shared/lib` = `api`, `useApi`, `usePaged`, `format`, `status`, `roles`, token store.
- Pickers over growing tables (clients, products, warehouses) use `SearchSelect` (server search, 20 rows per query). Never load a whole table with `?limit=200`.
- `useApi` keeps a small in-memory cache per path (stale-while-revalidate); logout and 401 clear it.
- Types mirror the `backend/` zod schemas and responses; no copy-paste types drifting from the API.
- Backend gap → fix it in `backend/` (own task line, `docs/BACKEND.md` rules). Never a client-side workaround. If the web needs the same change → `WEB:` line.
- Backend: rules live in `service.ts`, SQL in `repository.ts`, router = parse + authz + call + status code. Cross-domain import only service → other repository.
- No god files (> ~300 lines → split by sub-screen), no circular imports, no packages "for scale", no second state lib.

## Adding a screen

1. `TASKS.md` line. 2. Read `backend/src/modules/<d>/router.ts` (zod, `allow`) and the web feature in the web repo (fields, actions, texts). 3. `src/features/<name>/` + thin route in `src/app/`. 4. Navigation entry per role (table above). 5. i18n keys reused from source dictionaries, new ones in `messages/mobile.ts`. 6. Matrix rows in `docs/TESTING.md`.
