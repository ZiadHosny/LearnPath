---

description: "Task list for 005-global-http-contract (TS-04)"
---

# Tasks: Global error handling and response format

**Input**: [spec.md](spec.md), [plan.md](plan.md) · **Tests**: REQUIRED, written first.

## Phase 1: Tests first

- [X] T001 [P] [US1] Write `backend/tests/unit/response-format.test.ts`: every catalog code builds an `AppError` with the catalog status and message; a custom message overrides only the message; `toErrorBody` gives `{ error: { code, message, details? } }`; `toSuccessBody` returns data unchanged by default and `{ data }` with the envelope on; `undefined` (204) stays `undefined`
- [X] T002 [P] [US2] Write `backend/tests/unit/request-id.test.ts`: missing id → new UUID set on request and response header; valid caller id kept; id longer than 64 chars or with unsafe characters replaced
- [X] T003 [P] [US2] Write `backend/tests/integration/http-contract.test.ts`: every response (200, 401, 404, 400) has `X-Request-Id`; a caller id is echoed; the request log line contains `requestId=<id>`; an unexpected error (test-only controller that throws) returns the generic 500 body and its error log line has the same request id and the stack; success bodies unchanged by default; with the envelope on (test override) a 200 body is `{ data }` and a 204 is empty

## Phase 2: Implementation

- [X] T004 [US1] Create `backend/src/common/http/error-catalog.ts` and `app-error.ts` (move `AppError`, `Errors`, `TooManyAttemptsError` from `common/errors.ts`, statuses and messages from the catalog); update all imports; delete `backend/src/common/errors.ts`
- [X] T005 [US1] Create `backend/src/common/http/response-format.ts` (`RESPONSE_FORMAT = { envelope: false }`, `toErrorBody`, `toSuccessBody`, `configureResponseFormat` for tests)
- [X] T006 [US1] Move the filter to `backend/src/common/http/all-exceptions.filter.ts` (uses `toErrorBody`, logs `requestId`); create `response.interceptor.ts` (global `APP_INTERCEPTOR`); register both in `backend/src/app.module.ts`; update `structure.test.ts` paths
- [X] T007 [US2] Create `backend/src/common/http/request-id.middleware.ts`; register it first in `backend/src/app.setup.ts`; add `requestId` to request log lines
- [X] T008 [US1] Docs: `ApiError` takes statuses from the catalog; `ErrorResponseDto` unchanged

## Phase 3: Polish

- [X] T009 Full backend suite, lint, typecheck, build; 0 web app files changed; README section "HTTP responses and errors"
