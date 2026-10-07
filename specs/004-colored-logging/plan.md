# Implementation Plan: Colored, customizable logging

**Branch**: `004-colored-logging` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Add a global `AppLogger` (implements Nest's `LoggerService`, plus `success`) in a global
`LoggingModule`; NestJS uses it via `app.useLogger`. Styles per level live in
`logger.config.ts`; `LOG_LEVEL`, `LOG_COLORS`, `LOG_FORMAT` join the validated environment.
A request-logging middleware writes one line per finished request with tokens masked. Auth,
users and password-reset services log their events with story tags and user ids only.

## Technical Context

**Language/Version**: TypeScript 6, NestJS 12, ESM · **New dependencies**: none (colors via
`node:util` `styleText`) · **Testing**: Vitest unit tests for the logger and middleware;
integration test capturing log lines during the account flows

## Constitution Check

| Principle | Status |
|---|---|
| II. Every acceptance criterion tested | ✅ unit tests (US1, US2), integration test (US3) |
| III. Secure Authentication | ✅ FR-008 tested: no password, token, email, cookie in logs |
| V. Simplicity | ✅ no logging library; one service, one config file, one middleware |

## Design

| Piece | File |
|---|---|
| Levels, default styles, rank order, option types | `backend/src/common/logging/logger.config.ts` |
| `AppLogger` (`log/error/warn/debug/verbose/fatal/success`, `configure()`, pluggable sink) | `backend/src/common/logging/app-logger.service.ts` |
| Global module exporting `AppLogger` | `backend/src/common/logging/logging.module.ts` |
| Request line middleware (factory, masks tokens) | `backend/src/common/logging/request-logger.middleware.ts` |
| Env settings `LOG_LEVEL`, `LOG_COLORS`, `LOG_FORMAT` | `backend/src/config/env.validation.ts` |
| Wiring | `main.ts` (`bufferLogs`, `useLogger`), `app.setup.ts` (middleware), exception filter uses `AppLogger` |
| Account events | `auth.service.ts`, `auth.controller.ts` (logout), `users.service.ts`, `password-reset.service.ts` |

**Call shape**: `logger.success('User registered', { context: 'AuthService', story: 'US-01', userId })`;
the Nest form `logger.log(message, 'Context')` keeps working.

**Pretty line**: `2026-10-07 23:40:12.345 SUCCESS [AuthService] [US-01] User registered userId=…`
**JSON line**: `{"time":"…","level":"success","context":"AuthService","story":"US-01","message":"User registered","userId":"…"}`
