# Quickstart: Validate the NestJS Migration

Proves SC-001 – SC-007. Contract: [contracts/api-compatibility.md](contracts/api-compatibility.md).
Baseline walkthrough: [001 quickstart.md](../001-auth-accounts/quickstart.md).

## Prerequisites

Same as 001: Node.js 24, Docker running, `backend/.env` present. From the repo root:

```bash
npm run services:up
npm install --prefix backend      # new dependencies; runs prisma generate
```

## Gates during the migration (FR-017a/b)

| After step | Command | Must pass |
|---|---|---|
| 1. CommonJS + Jest switch (still Express) | `npm run test:api` | 72 / 72 |
| 2. Nest skeleton | `npm --prefix backend test -- harness compat` | harness (404 body) |
| 3. Auth module | `npm --prefix backend test -- us01 us02 us03 compat` | US-01, US-02, US-03 |
| 4. Users module | `npm --prefix backend test -- us01 us02 us03 us04 us05 us06 compat` | + US-04, US-05, US-06 |
| 5. Password-reset module | `npm run test:api` | all EP-01 tests |
| 6. Docs + cleanup | `npm test && npm run lint && npm run build` | everything incl. `openapi` and `structure` tests, both projects |

## Final checks

| # | Check | How | Expected |
|---|---|---|---|
| 1 | SC-001 | `npm run test:api` | all EP-01 tests pass; `git diff 001-auth-accounts -- backend/tests` shows only runner syntax / app start-up changes |
| 2 | SC-002 | `git diff 001-auth-accounts --stat -- frontend/` and `npm run test:web` | 0 files changed; all frontend tests pass |
| 3 | SC-003 | `npm run dev`, then the 001 scripted walkthrough (31 checks) | 31 / 31 |
| 4 | SC-004 | open http://localhost:3000/api/docs | 11 endpoints under Auth / Profile / Password reset; "Try it out" works for login |
| 5 | SC-004 | Apidog → Import → OpenAPI → URL `http://localhost:3000/api/openapi.json` | 11 endpoints imported |
| 6 | SC-005 | doc test adds a throw-away controller in a test module | it appears in the document with no doc file edited |
| 7 | SC-006 | log in on the 001 API (`git switch 001-auth-accounts`), switch to this branch, restart API, use the app | still logged in; renewal works |
| 8 | FR-014 | `NODE_ENV=production npm --prefix backend start`, open `/api/docs` and `/api/openapi.json` | both `404 NOT_FOUND` |
| 9 | FR-008 | `npm run db:status` | "Database schema is up to date"; no new folder in `prisma/migrations` |
| 10 | SC-007 | `npm --prefix backend test -- structure` | green (no Express-era files, no Zod/Vitest) |
