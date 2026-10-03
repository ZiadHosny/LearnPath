# Research: Authentication & Accounts

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-30

The stack is fixed by the constitution (Angular, Node.js + Express, PostgreSQL, JWT, bcrypt).
This file records the choices made inside that stack. Local toolchain found: Node 24.15,
npm 11.12, Angular CLI 22.0, Docker 20.10.

## R1. Language on the backend

- **Decision**: TypeScript on Node.js 24 LTS, Express 5.
- **Rationale**: the frontend is already TypeScript; one language means shared habits and
  typed request/response shapes. Express 5 forwards rejected promises to the error handler,
  removing try/catch boilerplate.
- **Alternatives**: plain JavaScript (less setup, no types; rejected: auth code benefits most
  from type checking); Express 4 (needs an async wrapper).

## R2. Database access and migrations

- **Decision**: Prisma ORM with Prisma Migrate; PostgreSQL 17 in Docker for dev and tests.
- **Rationale**: schema file + generated migrations + typed client with little code; seed
  script support built in (needed for Admin/Instructor/Blocked seed accounts).
- **Alternatives**: `pg` with hand-written SQL (most control, more code, manual migrations);
  Knex (query builder, no types from schema); Drizzle (good, less familiar to most teams).

## R3. Input validation

- **Decision**: Zod schemas per endpoint, applied by one `validate` middleware; schemas are
  strict (unknown fields → 400), which also rejects attempts to change `email` (FR-017).
- **Rationale**: constitution III requires server-side validation of all input; Zod gives one
  place for rules and typed output.
- **Alternatives**: express-validator (chain style, weaker typing); Joi (no TS inference).

## R4. Password hashing

- **Decision**: `bcrypt` (native, prebuilt binaries), cost factor 12. Login with an unknown
  email still runs one bcrypt compare against a fixed dummy hash.
- **Rationale**: constitution mandates bcrypt. The dummy compare makes response time the same
  for known and unknown emails (SC-005).
- **Alternatives**: `bcryptjs` (pure JS, ~3× slower, no native build; fallback if install
  fails on a machine); argon2 (stronger, but not what the constitution names).

## R5. Login lifetime and renewal (FR-011, FR-011a–c, FR-012)

- **Decision**:
  - **Access token**: JWT, HS256, 15-minute expiry, claims `sub` (user id), `role`, `sid`
    (session id). Sent as `Authorization: Bearer`. Held in memory in Angular (a signal in
    `AuthService`), not in `localStorage`.
  - **Refresh credential**: opaque random 32-byte token, stored only as a SHA-256 hash in a
    `sessions` row. Sent as cookie `lp_refresh` (`HttpOnly`, `SameSite=Strict`,
    `Path=/api/auth`, `Secure` outside dev). Session absolute expiry = sign-in + 7 days.
    No rotation.
  - **Refresh** (`POST /api/auth/refresh`) loads the session and user, refuses if session
    ended/expired (401) or user Blocked (403, session ended), and issues a new access token
    with the **current** role.
  - **Page reload**: Angular calls refresh on start-up (`provideAppInitializer`) to restore
    the login from the cookie.
- **Rationale**: meets the clarified 15 min / 7 days behaviour; role and block changes apply
  at the next renewal. `HttpOnly` cookie keeps the long-lived credential out of JavaScript;
  in-memory access token limits XSS impact. No rotation avoids the parallel-tab race and
  satisfies "several requests at the moment of renewal all complete".
- **Alternatives**: refresh token rotation with reuse detection (stronger, but concurrency
  handling is extra complexity for Phase 1); access token in `localStorage` (what many
  tutorials do; survives reload without a refresh call, but readable by any injected script);
  server-side sessions only, no JWT (simplest, but constitution names JWT).

## R6. CSRF on the refresh cookie

- **Decision**: rely on `SameSite=Strict` plus same-origin serving (Angular dev proxy in dev;
  one origin behind a reverse proxy in other environments). Refresh and logout accept only
  `POST` with `Content-Type: application/json`.
- **Rationale**: the cookie is sent only to `/api/auth/*`, only same-site; those endpoints
  return a token only to same-origin script (CORS not enabled for other origins).
- **Alternatives**: double-submit CSRF token (unneeded given the above).

## R7. Failed-login block (FR-010)

- **Decision**: table `login_attempts(email, attempted_at)`. On login: if ≥5 failures for the
  email in the last 15 minutes → `429 TOO_MANY_ATTEMPTS` with `Retry-After` (seconds until
  fifth failure + 15 min); attempts made while blocked are **not** recorded (edge case: no
  extension). On a wrong password, insert a row. On success, delete rows for that email.
  Applies to unknown emails too, so blocking reveals nothing.
- **Rationale**: DB-backed, survives restarts, trivial to test with fixed clocks.
- **Alternatives**: `express-rate-limit` per IP (different rule: per IP, not per email);
  in-memory map (lost on restart, breaks with >1 process).

## R8. Password reset tokens (FR-022 – FR-026)

- **Decision**: random 32-byte token in the link `/<app>/reset-password/<token>`; DB stores
  SHA-256 hash, `expires_at = now + 1h`, `used_at`. Issuing a new one deletes the user's
  earlier unused ones. `GET /api/auth/password-reset/:token` lets the screen show
  "Link expired" before the form. Confirm marks used, updates the password, ends all
  sessions. The request endpoint always returns `202` immediately and sends the email after
  responding, so timing does not reveal account existence.
- **Alternatives**: signed JWT reset link (stateless, but "use once" and "only the latest
  link works" need DB state anyway).

## R9. Email delivery

- **Decision**: Nodemailer over SMTP. Dev and tests: **Mailpit** container (SMTP `1025`, web
  UI `8025`). Real SMTP settings come from env vars in other environments. Integration tests
  read the sent message through Mailpit's HTTP API.
- **Alternatives**: provider SDK (SendGrid/SES; lock-in, not needed yet); logging the link to
  console (not testable end to end).

## R10. Profile photo upload (FR-018)

- **Decision**: Multer, memory storage, `limits.fileSize = 2 MB`; verify real type by magic
  bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`), not the file name. Save as
  `uploads/avatars/<userId>-<random>.<ext>` on local disk, served at `/uploads/...`; delete
  the previous file after a successful replace.
- **Rationale**: simplest thing that works for Phase 1; one place to swap for object storage
  later.
- **Alternatives**: S3-compatible storage (out of Phase 1 scope); storing bytes in PostgreSQL
  (bloats DB).

## R11. API error format (FR-008, FR-013, FR-014)

- **Decision**: every error body is `{ "error": { "code": "...", "message": "...",
  "details"?: [...] } }`. Codes listed in [contracts/auth-api.md](contracts/auth-api.md).
  Wrong current password on change returns `400`, not `401`, so the interceptor does not
  treat it as an expired login.
- **Rationale**: one shape for the Angular error mapper; codes are stable for tests.

## R12. Testing

- **Decision**:
  - **Backend**: Vitest + Supertest, integration tests against a real PostgreSQL test
    database (`learnpath_test`), reset between test files; Mailpit for email; a controllable
    clock (`now()` helper) for 15-minute / 1-hour / 7-day rules.
  - **Frontend**: Angular CLI's Vitest runner for component, guard, interceptor and service
    tests with `HttpTestingController`.
  - **Traceability**: each test name starts with the story and scenario id, e.g.
    `US-02 S5: sixth attempt within 15 minutes is refused` (constitution II).
- **Alternatives**: Jest (slower ESM/TS setup); Playwright end-to-end (valuable later; not
  required by the constitution for this feature; can be added for the 375 px checks).

## R13. Frontend structure and UI

- **Decision**: Angular 22 standalone components, signals for auth state, reactive forms,
  functional guards (`authGuard`, `guestGuard`, `roleGuard(...roles)`), functional HTTP
  interceptor with single-flight refresh on `401`. UI with Angular Material form fields,
  buttons and snack bars for success messages; responsive layout down to 375 px.
- **Alternatives**: NgModules (legacy); NgRx store (too much for one auth state); Tailwind
  only (fine, but Material gives accessible form controls for free).

## R14. Seeds and placeholders

- **Decision**: `prisma db seed` creates `admin@learnpath.local` (Admin),
  `instructor@learnpath.local` (Instructor), `student@learnpath.local` (Student) and
  `blocked@learnpath.local` (Student, Blocked), passwords from env (dev default
  `Passw0rd!`). Placeholder routes: `/catalog`, `/my-learning`, `/my-courses`,
  `/admin/dashboard`.
