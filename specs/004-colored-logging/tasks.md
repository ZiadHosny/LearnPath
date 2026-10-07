---

description: "Task list for 004-colored-logging (TS-03)"
---

# Tasks: Colored, customizable logging

**Input**: [spec.md](spec.md), [plan.md](plan.md) · **Tests**: REQUIRED (constitution II), written first.

## Phase 1: Setup

- [X] T001 Add `LOG_LEVEL` (`error|warn|success|log|debug|verbose`, default `log`), `LOG_COLORS` (`auto|true|false`, default `auto`), `LOG_FORMAT` (`pretty|json`, default `pretty`) to `backend/src/config/env.validation.ts` and `backend/.env.example`; set `LOG_LEVEL=error` in `backend/tests/helpers/test-env.ts`

## Phase 2: User Stories 1 & 2 - Colored, customizable logger (P1)

- [X] T002 [P] [US1] Write `backend/tests/unit/app-logger.test.ts`: one line per level with its color (ANSI codes present) and label; story tag `[US-02]`; extra fields as `key=value`; error stack printed; Nest call form `log(msg, 'Ctx')` sets context
- [X] T003 [P] [US2] Add to the same file: `level: 'warn'` hides success/log/debug/verbose; `colors: false` and `NO_COLOR` → no ANSI codes; `format: 'json'` → parseable object with time, level, context, story, message, fields; custom style overrides color/label
- [X] T004 [US1] Create `backend/src/common/logging/logger.config.ts` (levels, ranks, default styles, `LoggerOptions`, `loggerOptionsFromEnv(env)`)
- [X] T005 [US1] Create `backend/src/common/logging/app-logger.service.ts` (`AppLogger implements LoggerService`, `success`, `configure()`, sink) and `logging.module.ts` (`@Global`)
- [X] T006 [US1] Wire: `LoggingModule` in `backend/src/app.module.ts`; `bufferLogs: true` + `app.useLogger(app.get(AppLogger))` in `backend/src/main.ts` and `backend/src/openapi-export.ts`; `AllExceptionsFilter` logs through `AppLogger`

## Phase 3: User Story 3 - Requests and account events (P2)

- [X] T007 [P] [US3] Write `backend/tests/unit/request-logger.test.ts`: one line per finished request with method, path, status, duration; level by status class; long token-like segments masked
- [X] T008 [P] [US3] Write `backend/tests/integration/logging.test.ts`: capture lines via `AppLogger.configure({ level: 'verbose', sink })` during register, login, failed login, logout, password change, reset request and confirm; each event line has its story and level; no captured line contains the password, email, refresh/reset token, access token or cookie; every request produced one request line
- [X] T009 [US3] Create `backend/src/common/logging/request-logger.middleware.ts`; register it in `backend/src/app.setup.ts` before routes
- [X] T010 [US3] Log account events with story tags and user id only in `backend/src/modules/auth/auth.service.ts` (US-01 register, US-02 login success/failure), `auth.controller.ts` or `session.service.ts` (US-03 logout), `backend/src/modules/users/users.service.ts` (US-06), `backend/src/modules/password-reset/password-reset.service.ts` (US-07 requested, done)

## Phase 4: Polish

- [X] T011 Run all backend tests, lint, typecheck, build; start the API and check the colored start-up output; update `README.md` (logging settings)
