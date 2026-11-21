# 02 architect

Run before code for: new screen, new write-path (form/action that calls a mutating endpoint), new navigation entry, or new native capability. Skip for copy/style tweaks.

## Plan (write it in chat, ≤ 10 lines)

```
Folder:     src/features/<d>/… · src/app/(app)/<d>/… (thin route)
API:        backend/src/modules/<d>/{router,repository[,service]}.ts — endpoint, zod limits, allow(roles), tx/lock, migration
Write-path: screen → form fields (same limits as zod) → api() → status code → refresh/useApi reload
Read-path:  list shape { items,total,page,limit } via usePaged · q · status chips
Fail-path:  401 · 403 · 404 · 409 <rule> · 422 <field>  (API text shown as-is, already translated by x-lang)
Invariants: which ones from ARCHITECTURE.md the server enforces; the app only previews, never decides
UI:         screen pattern (list / sheet form / detail) · states · labels · testID · role gating
Tests:      matrix rows to add in TESTING.md (ID + S1/S2/S3), Maestro flow paths
```

Missing a fact that changes the plan → one question, stop. Otherwise proceed.

## Decide

- Backend gap (missing field, filter, endpoint) → change `backend/` per `docs/BACKEND.md` (rule spans > 1 table → `service.ts` + `tx()`), never a client-side workaround.
- Money / stock / status write → submit disabled while in flight, no automatic retry, show the server result.
- Status actions → read the transition map from the source `orders/service.ts` (or the domain service); hide what the role or state cannot do.
- Reuse `src/shared/ui` + `usePaged` + `api`. New primitive only if 2+ screens need it.
- File > ~300 lines → split by sub-screen, not by "layer".

## Reject

Repositories-of-repositories, DTO mappers, generic base classes, event buses, feature flags, caching layers beyond `useApi`, "utils" dumping grounds, new packages — unless the task explicitly needs them and has a permit.
