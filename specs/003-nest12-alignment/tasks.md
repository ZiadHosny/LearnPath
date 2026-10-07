---

description: "Task list for 003-nest12-alignment (TS-02)"
---

# Tasks: Align the API with the NestJS 12 defaults

**Input**: [spec.md](spec.md), [plan.md](plan.md)

**Tests**: REQUIRED (constitution II). The existing backend suite is the safety net for US1;
`structure.test.ts` gains the US2 checks.

## Phase 1: Setup

- [X] T001 Add `"type": "module"` to `backend/package.json`; set `moduleFormat = "esm"` in the `generator client` block of `backend/prisma/schema.prisma`; run `npm --prefix backend run db:generate`
- [X] T002 Create `backend/vitest.config.ts` (`globals: true`, `include: ['tests/**/*.test.ts']`, `fileParallelism: false`, `testTimeout: 20000`, `hookTimeout: 60000`, `globalSetup: ['tests/helpers/global-setup.ts']`, `setupFiles: ['tests/helpers/test-env.ts', 'tests/helpers/setup.ts']`); rename `backend/tests/helpers/jest-env.ts` → `test-env.ts`; set `backend/tsconfig.json` `types` to `["node", "vitest/globals"]`
- [X] T003 Replace `__dirname` with `import.meta.dirname` in `backend/tests/integration/structure.test.ts` and `__filename` with `import.meta.filename`

## Phase 2: User Story 1 - Nothing changes (Priority: P1)

- [X] T004 [US1] Set `"test": "vitest run"` in `backend/package.json`; run `npm --prefix backend test` → **gate: 81/81 on Vitest, ESM**
- [X] T005 [US1] Uninstall `jest`, `@swc/jest`, `@types/jest`; delete `backend/jest.config.js`; remove `jest.config.js` from `backend/eslint.config.mjs` ignores

## Phase 3: User Story 2 - Set up like NestJS 12 (Priority: P2)

- [X] T006 [US2] Extend `backend/tests/integration/structure.test.ts`: `package.json` has `"type": "module"`; `vitest` is a devDependency; no `jest`, `@swc/jest`, `@types/jest`; no script contains `experimental`; the scripts `start:dev`, `start:debug`, `start:prod`, `test:watch`, `test:cov`, `test:e2e`, `format`, `dev`, `start`, `test`, `openapi` exist; `rxjs` is a dependency
- [X] T007 [US2] Add scripts to `backend/package.json`: `start:dev` = `nest start --watch`, `start:debug` = `nest start --debug --watch`, `start:prod` = `node dist/main.js`, `test:watch` = `vitest`, `test:cov` = `vitest run --coverage`, `test:e2e` = `vitest run`, `format` = `prettier --write "src/**/*.ts" "tests/**/*.ts"`; install `rxjs`, dev `@vitest/coverage-v8@^4`, `prettier`
- [X] T008 [US2] In `backend/src/main.ts` use top-level `await bootstrap()` and `new Logger('Bootstrap').log(...)` instead of `console.log`
- [X] T009 [US2] Run `npm --prefix backend test` → **gate: all tests green incl. extended structure test**

## Phase 4: Polish

- [X] T010 Update root `package.json` (`test:e2e`, `test:cov` passthrough) and `README.md` (ESM + Vitest note)
- [X] T011 Run `npm run build`, `npm run lint`, `npx prisma db seed`, `npm run openapi`, `npm run test:cov` (backend), `NODE_ENV=production node backend/dist/main.js` (docs → 404) → all succeed
- [X] T012 Run `npm run dev` + the 001 scripted walkthrough (31 checks) and `git diff master --stat -- frontend/` (0 files); record results in `specs/003-nest12-alignment/checklists/verification.md`
