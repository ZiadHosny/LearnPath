# Verification: Move the API to NestJS

**Date**: 2026-10-04 · **Branch**: `002-nestjs-migration` · Checks from [quickstart.md](../quickstart.md)

## Gates (FR-017a/b)

| Step | Command | Result |
|---|---|---|
| 1. CommonJS + Jest (still Express) | `npm --prefix backend test` | 72 / 72 |
| 2. Nest skeleton | `npm --prefix backend test -- harness compat` | harness + 404 / malformed JSON / 413 green |
| 3. Auth module | `… -- us01 us02 us03 compat compat-tokens` | 30 / 34 (the 4 open ones called users / reset routes not yet migrated) |
| 4. Users module | `… -- us01 … us06 compat compat-tokens` | 55 / 56 (the open one called the reset route) |
| 5. Password-reset module | `npm --prefix backend test` | all EP-01 + compat green (only the US2 docs test open) |
| 6. Docs + cleanup | `npm --prefix backend test` | **81 / 81** |

## Final checks

| # | Check | Result |
|---|---|---|
| 1 | SC-001 — EP-01 API tests on Nest, assertions unchanged | ✅ all pass. Only diff on an `expect` line: `expect(mail, msg)` → `if (!mail) throw …; expect(mail)` (Jest has no custom-message argument; same check). us04 setup changed from an Express Router to a `@Roles` test controller (setup only) |
| 2 | SC-002 — web app unchanged | ✅ `git diff 001-auth-accounts --stat -- frontend/` = 0 files; frontend 55 / 55 |
| 3 | SC-003 — 001 walkthrough through the dev proxy | ✅ 31 / 31 |
| 4 | SC-004 — docs page | ✅ http://localhost:3000/api/docs serves Swagger UI; 11 operations |
| 5 | SC-004 — Apidog import | ⏳ manual: document validated with swagger-parser in tests; import into Apidog Desktop not done by hand yet |
| 6 | SC-005 — new endpoint documented automatically | ✅ throw-away controller test |
| 7 | SC-006 — logins from before the switch | ✅ `compat-tokens.test.ts` (token and session created the Express way) |
| 8 | FR-014 — production | ✅ `NODE_ENV=production node dist/main.js`: `/api/docs` and `/api/openapi.json` → 404; API answers |
| 9 | FR-008 — database | ✅ "Database schema is up to date"; still 4 migration folders |
| 10 | SC-007 — old stack gone | ✅ `structure.test.ts` |

Also: `npm run build` (0 type errors), `npm run lint` (clean), `npm run openapi` (11 operations), `npx prisma db seed` (4 accounts).

## Deviations from tasks.md (decided during implementation)

| Task | Planned | Done | Why |
|---|---|---|---|
| T003 | `jest.config.ts` | `jest.config.js` | A TS config needs `ts-node` |
| T007 | `jest --runInBand` | `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand` | NestJS 12 ships as ESM; Jest loads it only with this flag (research R3) |
| T019 | body-parser errors mapped in the filter | mapped by an Express error middleware right after `useBodyParser` in `app.setup.ts` | Nest turns a parse error into a generic `BadRequestException` and loses the kind of failure |
| T039 | `nest build` checked right away | checked after T047 | Express files still compiled until deleted |
| T045 | `scripts/export-openapi.ts` run by tsx | `src/openapi-export.ts`, `npm run openapi` = `nest start --entryFile openapi-export` | tsx/esbuild does not emit decorator metadata, which Nest DI needs |
| — | not planned | `tsconfig.build.json` (Nest convention) | build only `src/` so output is `dist/main.js` |
| — | not planned | `reflect-metadata` installed in T004 instead of T008 | `jest-env.ts` imports it first |
