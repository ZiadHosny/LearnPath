# Implementation Plan: Global error handling and response format

**Branch**: `005-global-http-contract` | **Date**: 2026-10-07 | **Spec**: [spec.md](spec.md)

## Summary

Move everything that shapes an HTTP response into `backend/src/common/http/`: an error catalog,
`AppError` built from it, one response-format module (error body, success body, envelope
switch), the global exception filter, a global response interceptor, and a request-id
middleware. Defaults keep today's contract.

## Layout

```text
backend/src/common/http/
├── error-catalog.ts          # code → { status, message }  ← change messages/statuses here
├── app-error.ts              # AppError(code, { message?, details? }), Errors.*, TooManyAttemptsError
├── response-format.ts        # RESPONSE_FORMAT settings + toErrorBody / toSuccessBody  ← change shapes here
├── all-exceptions.filter.ts  # moved from common/filters; uses response-format + request id
├── response.interceptor.ts   # global; success bodies through toSuccessBody
└── request-id.middleware.ts  # X-Request-Id in/out, stored on the request
```

`common/errors.ts` and `common/filters/` are removed; imports updated. The request logger and
the exception filter add `requestId` to their log lines. `ErrorResponseDto` / `ApiError` (docs)
read statuses from the catalog.

## Constitution Check

| Principle | Status |
|---|---|
| II. Tests | ✅ unit tests (catalog, response format with envelope on/off, request-id rules); integration (header, logs); existing suite unchanged |
| III. Security | ✅ 500 bodies never carry internals; logs never carry bodies |
| V. Simplicity | ✅ one folder, no new dependency (`crypto.randomUUID`) |

## Build Order

1. Tests first (unit + integration) → fail.
2. `error-catalog.ts`, `app-error.ts` (same `Errors.*` API), update imports.
3. `response-format.ts`, filter move, interceptor, request-id middleware, wiring.
4. Full suite, lint, build, walkthrough.
