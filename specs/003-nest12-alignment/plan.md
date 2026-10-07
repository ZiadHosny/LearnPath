# Implementation Plan: Align the API with the NestJS 12 defaults

**Branch**: `003-nest12-alignment` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Turn `backend/` into an ES module project and run its tests on Vitest, matching a fresh NestJS 12
`nest new`; add the standard scripts, `rxjs` and `Logger`. The 81 existing tests are the safety
net; no behaviour changes. Target confirmed by scaffolding `nest new` (NestJS 12) on 2026-10-04
and by a Vitest + Nest dependency-injection probe on 2026-10-07.

## Technical Context

**Language/Version**: TypeScript 6, Node.js 24, ES modules (`module`/`moduleResolution` `nodenext`)

**Primary Dependencies**: unchanged from 002, plus `rxjs`; test runner Vitest 4 (Vite 8) with
`@vitest/coverage-v8`; removed: `jest`, `@swc/jest`, `@types/jest`

**Storage**: unchanged; Prisma client generated as ESM (`moduleFormat = "esm"`)

**Testing**: Vitest, `globals: true`, `fileParallelism: false` (one database), same global setup
(`prisma migrate deploy`) and per-test setup (truncate, clock reset)

**Constraints**: zero client-visible change; no experimental Node flags

## Constitution Check

| Principle | Status |
|---|---|
| I. Vertical Slice (technical story clause) | ✅ done when criteria tested and existing tests pass |
| II. Every Acceptance Criterion Tested | ✅ existing suite (US1); `structure.test.ts` extended for ESM / Vitest / no Jest / no flag (US2) |
| III. Secure Authentication | ✅ no code path changes |
| IV. Role-Based Access | ✅ unchanged |
| V. Simplicity | ✅ removes a dependency set and an experimental flag; no new layers |
| Technology Constraints (NestJS) | ✅ |

## Decisions

| Decision | Choice | Notes |
|---|---|---|
| Module system | `"type": "module"` | Imports already use `.js` suffixes; `__dirname` → `import.meta.dirname`; top-level `await` allowed in `main.ts` |
| Prisma client | `moduleFormat = "esm"` | Regenerate; schema models unchanged |
| Tests | Vitest 4, `vitest.config.ts` | `include: ['tests/**/*.test.ts']`, `setupFiles: [env, setup]`; no SWC plugin needed (Vite 8 transformer emits decorator metadata from `tsconfig.json`) |
| Test files | unchanged | Jest globals = Vitest globals; the Jest-only workaround in us07 stays (valid in both) |
| Scripts | add `start:dev`, `start:debug`, `start:prod`, `test:watch`, `test:cov`, `test:e2e`, `format`; keep `dev`, `start`, `test`, `openapi`, `db:*` | `test:e2e` runs the same suite (all our tests are end-to-end) |
| Lint | ESLint stays | shared with Angular |

## Build Order

| Step | Gate |
|---|---|
| 1. ESM switch + Prisma ESM + Vitest config (Jest still installed, unused) | 81/81 on Vitest |
| 2. Remove Jest packages/config, extend `structure.test.ts` | 81+/81+ |
| 3. Scripts, `rxjs`, `Logger` | build, lint, typecheck, seed, openapi |
| 4. Walkthrough | 31/31, 0 frontend files changed |
