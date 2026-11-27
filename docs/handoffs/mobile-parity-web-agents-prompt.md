# Handoff prompt — Mobile parity with web (LLM + 5 agents + Insights)

Paste / open as the **first message** of a new agent session in the **tradeflow-mobile** repo  
(`/Users/amirxon/Desktop/SeriusSoft/tradeflow-mobile`).

Source of truth also mirrored in web `docs/TASKS.md` line `3.3c` / mobile `docs/TASKS.md` line `M7.*`.

Web repo (read-only SRC): `/Users/amirxon/Desktop/SeriusSoft/tradeflow`  
Web tip (verified 2026-11-27): commit `6a6dea3` · GitHub `amirkhan-kh/TradeFlow` · Contabo API live.

---

TradeFlow Mobile — vazifa: **webdagi oxirgi ~1 haftalik agent/LLM/Insights qo‘shimchalarini mobile UI da tenglashtirish**.

## ⚠️ SHARED SERVER (o‘qib ishlat — birinchi qoida)

Mobile va web **bitta production API**ni ishlatadi:

| | Qiymat |
|---|---|
| API | `https://api.13-140-202-159.sslip.io` (`/api/v1`) |
| Host | Contabo VPS `adminamirdev@13.140.202.159` · `~/projects/TradeFlow` |
| Compose | `docker-compose.prod.yml` (web repo) |
| Web UI | `https://trade-flow-one-psi.vercel.app` |
| Demo login (prod) | `manager` / `demo123` |

**Natija:**

1. **LLM + 5 agent + Insights optimize + `create_audit` ALLAQACHON Contabo da** (web 3.3b deploy). Mobile app faqat shu endpointlarni chaqirishi kerak — serverda agent-chat ni qayta yozish / qayta seed / `down -v` **TAQIQLANGAN**.
2. Mobile repodagi `backend/` — lokal/dev nusxa. Uni Contaboga `git pull` qilib **almashtirma**. Prod backend manbai = **web repo** (`tradeflow`).
3. Har qanday **API o‘zgarishi** (auth token body, `/public/app-version`, yangi route) → **web repo**da qil → GitHub → Contabo `git pull && docker compose -f docker-compose.prod.yml up -d --build`. Mobile sessionda Contaboni buzma.
4. Smoke / yozuv testlari: prod DB da **ehtiyot** — `create_audit` duplicate 409 OK; mass write / reseed / migration qo‘lda → Need permit.
5. App `EXPO_PUBLIC_API_URL` prod/preview da Contabo HTTPS bo‘lishi kerak. Dev emulator default (`10.0.2.2:4002`) — lokal; parity smoke uchun Contabo URL ishlat (yoki lokal faqat UI).

```
Brauzer (Vercel) ──rewrite──┐
                            ├──► Contabo API + PG + Gemini
Expo app (Bearer) ──────────┘
```

---

## Boot (majburiy — mobile repo)

1. O‘qi: `AGENTS.md`, `CLAUDE.md`, `docs/ORCHESTRATION.md`, `docs/STRICT.md`, `docs/skills/00-router.md`, `docs/MOBILE-UI.md`.
2. Voice: `.agents/skills/caveman/SKILL.md` (caveman) — birinchi javobdan.
3. `docs/TASKS.md` da birinchi ochiq `M7.*` ni `[~]` qil. Boshqa `[~]` bo‘lsa — pauza, faqat shu line.
4. Route: `docs/MOBILE-UI.md` (+ API shartnoma uchun web `docs/BACKEND.md` read-only). Skill: `docs/skills/02-architect.md` (yangi screen).
5. Bitta session = bitta `M7.*` sub-line. Fat chat → handoff yozib to‘xta.
6. SRC UI = web `frontend/src/features/insights/*`. API behavior = **live Contabo** (allaqachon deploy).

## Loyiha qisqa

| | Web | Mobile |
|---|---|---|
| UI | Next.js 16 | Expo SDK 58 + NativeWind |
| **Prod API** | **Contabo (shu)** | **Contabo (shu)** — bir xil |
| Auth | Cookie (Vercel first-party) | Bearer `Authorization` (+ ixtiyoriy cookie) |
| Login body `token` | Contaboda hali yo‘q bo‘lishi mumkin | Kerak: `X-Client: mobile` → `{ token }` (**WEB patch**) |
| LLM / agents | Contaboda ✓ | UI chaqiradi; BE qayta deploy qilma |

**Auth blocker (prod):** Contabo Bearer ni qabul qiladi (`core/auth.ts`). Lekin `POST /auth/login` bodyda `token` faqat mobile backend nusxasida. App Contaboga ulansa — avval **web**ga `docs/web-backend-mobile.patch` (yoki ekvivalent) → Contabo rebuild. Buni mobile `backend/` ni serverga chiqarib qilma.

Tekshir (smoke oldidan):

```bash
# login — token bormi?
curl -sS -X POST 'https://api.13-140-202-159.sslip.io/api/v1/auth/login' \
  -H 'Content-Type: application/json' -H 'X-Client: mobile' \
  -d '{"username":"manager","password":"demo123"}'
# chat allaqachon ishlaydimi? (cookie yoki Bearer)
curl -sS -X POST 'https://api.13-140-202-159.sslip.io/api/v1/agents/chat' \
  -H 'Content-Type: application/json' -H 'Authorization: Bearer <token>' \
  -d '{"agent":"auto","messages":[{"role":"user","content":"Audit kechikkan omborlar?"}]}'
```

---

## A) WEB / Contabo — nima ISHLAYDI (2026-11-27 smoke)

### CRM
Warehouses, products, stock, clients, orders, deliveries, payments, audits, agents, leads, dashboard, i18n 5 til, integrations, staff/activity (web UI).

### Insights + agentlar (Contaboda live)

| Agent | Chat tools (SELECT-only) | Insights findings | Write action |
|---|---|---|---|
| **stock** | `list_low_stock_cover` (+ `tavsiya buyurtma`, min_stock, `ombor`/`limit`), `list_slow_stock`, `list_expiring_products` | cover / slow-dead / expiry / belowMinStock | yo‘q → 5.3c |
| **finance** | `list_overlimit_clients`, `list_top_debtors`, `list_stale_debtors`, `collection_last_30_days` | overlimit + stale + collection | yo‘q → 5.4c |
| **sales** | `list_agent_pace`, `list_dormant_clients`, `monthly_revenue_trend` | forecast + pace + dormant | yo‘q → 5.5c |
| **logistics** | `delivery_delays_summary`, `list_late_deliveries`, `list_failed_deliveries`, `courier_open_load` | aggregate + samples | yo‘q → 5.6c |
| **audit** | stale / stuck / pending / variances | same | **`create_audit`** `POST /insights/actions` |

### Agent chat API (mobile chaqiradi — qayta yozma)
- `POST /api/v1/agents/chat`
- Body: `{ agent: "stock"|"finance"|"audit"|"sales"|"logistics"|"auto", messages: [{role, content}] }`
- Roles: **manager + auditor**; agent/courier → **403**
- Gemini: `GEMINI_API_KEY` Contabo `.env` da ✓; replyda tool/kod nomi yo‘q
- `detectAgent`: «audit kechikkan» → audit; explicit agent hint wins
- Web UI reference: `/dashboard/assistant`
- Migration `006` Contaboda allaqachon

### Contabo — nima YO‘Q / keyingi (web tasklar)
- Write actions 5.3c–5.6c
- Login body `token` for `X-Client: mobile` (WEB patch)
- `/public/app-version` Contaboda yo‘q bo‘lishi mumkin — gate soft fail qilsin yoki WEB da qo‘sh

---

## B) MOBILE — nima ISHLAYDI

- Auth Bearer + i18n 5 til + role tabs + More
- CRM screens (M2.x): dashboard, orders, clients, finance, deliveries, stock, products, warehouses, audits, leads, agents, profile, welcome
- Insights **list** `GET /insights` — **eski type** (`action`/`key` yo‘q); Contabo endi boyitilgan JSON qaytaradi → UI yangilanishi kerak
- Contabo ga ulansa: chat/insights BE **allaqachon** bor; faqat UI + auth yetishmaydi

## C) MOBILE — nima YO‘Q (shu parity — asosan APP)

1. **Assistant** screen + `POST /agents/chat` (Contabo)
2. Nav / banner / Insights CTA → Assistant
3. Insights types: `key`, `action`; `create_audit` tugmasi → `POST /insights/actions`
4. i18n kalitlar
5. Prod `EXPO_PUBLIC_API_URL` = Contabo HTTPS
6. **WEB (alohida session, web repo):** `X-Client: mobile` login `token` + ixtiyoriy `/public/app-version` → Contabo rebuild
7. *(Ixtiyoriy, lokal only)* mobile `backend/` ni SRC bilan sync — **faqat lokal compose**; Contaboga chiqarma

---

## Scope — sessionlar (bir session = bir line)

### M7.0 — Contabo ulanish + auth (BIRINCHI, agar token yo‘q)
- Web repo: login body `token` when `X-Client: mobile` (patch mavjud bo‘lsa apply).
- Contabo rebuild (**web** compose). Need permit: deploy/SSH.
- Smoke: mobile header bilan login → `token` → Bearer chat 200.
- Agar Contabo allaqachon token bersa — skip, to‘g‘ridan M7.2.

### M7.2 — Insights UI parity (Contabo `GET /insights`)
- `types.ts` → web Finding: `key`, `action: InsightAction | null`
- Action tugmasi `create_audit`; «Ochish» faqat action yo‘qida
- `mobileHref` saqlansin
- Check: typecheck; Contabo ga qarshi Insights ochiladi

### M7.3 — Assistant chat UI (Contabo `POST /agents/chat`)
- `AssistantScreen` — web `AssistantView` xulqi (chips, messages, input, `agent: "auto"`)
- Nav: More + dashboard banner + Insights CTA
- Faqat manager/auditor
- Check: typecheck; Contabo chat ×5; tool-nom leak yo‘q; agent role 403

### M7.4 — Smoke (Contabo)
- health; login Bearer; chat stock/finance/sales/logistics/auto; Insights findings; create_audit 201/409; agent 403
- **Prod DB ni buzma**; keraksiz write yo‘q

### M7.1a — (Ixtiyoriy) Lokal `backend/` sync
- Faqat lokal Docker uchun. Contabo bilan aralashtirma.
- SRC `agent-chat` + insights + `006` ko‘chir; mobile auth/app-version saqlansin.

**Tavsiya tartib:** M7.0 (agar kerak) → M7.2 → M7.3 → M7.4.  
**M7.1a ni birinchi qilma** agar maqsad Contabo parity bo‘lsa.

## SRC fayllar (UI + shartnoma; Contabo BE ni qayta deploy qilma)

```
# API contract (read)
tradeflow/backend/src/modules/agent-chat/router.ts
tradeflow/backend/src/modules/insights/router.ts
tradeflow/frontend/src/features/insights/types.ts

# UI reference
tradeflow/frontend/src/features/insights/AssistantView.tsx
tradeflow/frontend/src/features/insights/InsightsView.tsx
tradeflow/frontend/src/features/insights/agents.ts
tradeflow/frontend/src/features/shell/Shell.tsx

# WEB auth patch (Contabo uchun)
tradeflow-mobile/docs/web-backend-mobile.patch   # agar bor
tradeflow/backend/src/modules/auth/router.ts

# Agent detail (ixtiyoriy o‘qish)
tradeflow/docs/handoffs/5.3b-stock-agent-prompt.md
tradeflow/docs/handoffs/5.4b-finance-agent-prompt.md
tradeflow/docs/handoffs/5.5b-sales-agent-prompt.md
tradeflow/docs/handoffs/5.6b-logistics-agent-prompt.md
```

## Qoidalar

- Prompt = allow-list. Contabo SSH / rebuild / migrate / reseed / `down -v` → **Need permit: deploy** (va aniq buyruq).
- Mobile session **default**: faqat Expo app (`src/`). Shared API ni o‘zgartirish = web repo session.
- Invariants. Chat tools SELECT-only (serverda). Write faqat `POST /insights/actions` (`create_audit`) — ehtiyot smoke.
- Eng kichik diff. Drive-by refactor yo‘q.
- Done (M7.3): typecheck; Contabo chat UI ishlaydi; Insights action ishlaydi.

## Report (har session oxiri)

`Did` / `Files` / `Check` / `Next` (`docs/CAVEMAN.md`).

Boshlash: Contabo login+token tekshir → TASKS tegishli line `[~]` → UI.
