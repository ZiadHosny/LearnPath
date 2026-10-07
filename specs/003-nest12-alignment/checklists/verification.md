# Verification: Align the API with the NestJS 12 defaults

**Date**: 2026-10-07 · **Branch**: `003-nest12-alignment`

| Check | Result |
|---|---|
| SC-001 — backend tests on Vitest, assertions unchanged | ✅ 86 / 86 (81 existing + 5 new TS-02 structure checks); test files needed no syntax change (Vitest globals) |
| SC-002 — web app | ✅ `git diff master --stat -- frontend/` = 0 files |
| SC-003 — 001 walkthrough | ✅ 31 / 31 |
| SC-004 — no experimental flag, no Jest | ✅ 0 occurrences; `jest`, `@swc/jest`, `@types/jest`, `jest.config.js` removed (structure test) |
| SC-005 — build, lint, typecheck, seed, OpenAPI export | ✅ all succeed under ESM |
| Production mode | ✅ API serves; `/api/docs`, `/api/openapi.json` → 404; start-up line via `Logger` (`[Bootstrap]`) |

## Notes

- Vitest 4 (Vite 8) emits decorator metadata from `tsconfig.json`, so NestJS dependency injection
  works in tests without a plugin (probe on 2026-10-07).
- **Known issue — intermittent native crash on Windows.** About 1 run in 10, a Vitest worker
  exits with `0xC0000409` (STATUS_STACK_BUFFER_OVERRUN) before running its file; the run reports
  `Worker exited unexpectedly` and fewer tests (e.g. 76/86). No test ever fails on an assertion.
  Investigated 2026-10-07:
  - Not `bcrypt`: replacing it with `bcryptjs` still crashed (change reverted).
  - Not our code: the crash happens at worker start-up, in different files each time.
  - Same symptom under Vitest in 001; never seen in the many Jest runs of 002. Most likely the
    native transformer used by Vite 8 on Windows.
  - `pool: 'threads'` makes it worse (the whole run dies silently), so the default `forks` pool
    is kept. Workaround: rerun. Revisit when Vitest/Vite update, or report upstream.
- `test:cov` works (v8 coverage report produced) when the run does not hit the crash.
- Supersedes 002 FR-017b (Jest).
