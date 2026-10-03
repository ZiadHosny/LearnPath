---

description: "Task list for 001-auth-accounts (EP-01 Authentication & accounts)"
---

# Tasks: Authentication & Accounts

**Input**: Design documents from `/specs/001-auth-accounts/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/auth-api.md](contracts/auth-api.md),
[contracts/ui-routes.md](contracts/ui-routes.md), [quickstart.md](quickstart.md)

**Tests**: REQUIRED. Constitution II and SC-006 require every acceptance scenario to have at
least one automated test. Test tasks come first in each story and MUST fail before the
implementation tasks start. Every test name starts with the story and scenario id, e.g.
`it('US-02 S5: sixth attempt within 15 minutes is refused', …)`.

**Organization**: one phase per user story, in build order. Story labels map to the spec:
[US1] = US-01 Register, [US2] = US-02 Log in, [US3] = US-03 Log out, [US4] = US-04
Role-based access, [US5] = US-05 Profile, [US6] = US-06 Change password, [US7] = US-07
Reset password.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to
- Paths are relative to the repository root (`backend/`, `frontend/`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: create the two projects and local services.

- [X] T001 Create `docker-compose.yml` at repo root with `postgres:17` (db `learnpath`, user/password `learnpath`, port `5432`, volume `pgdata`) and `axllent/mailpit` (ports `1025` SMTP, `8025` UI/API); add `docker/postgres-init/01-create-test-db.sql` mounted into `/docker-entrypoint-initdb.d/` that runs `CREATE DATABASE learnpath_test;`
- [X] T002 Create root `.gitignore` (`node_modules/`, `dist/`, `coverage/`, `.env`, `backend/uploads/avatars/*`, `!backend/uploads/avatars/.gitkeep`, `.angular/`) and add empty `backend/uploads/avatars/.gitkeep`
- [X] T003 Scaffold backend in `backend/`: `package.json` (`"type": "module"`, scripts `dev` = `tsx watch src/server.ts`, `build` = `tsc`, `test` = `vitest run`, `lint` = `eslint .`, `typecheck` = `tsc --noEmit`), `tsconfig.json` (strict, `module`/`moduleResolution` `NodeNext`, `outDir` `dist`); install deps `express@5 @prisma/client zod jsonwebtoken bcrypt cookie-parser multer nodemailer helmet` and dev deps `typescript tsx vitest supertest prisma eslint typescript-eslint @types/express @types/jsonwebtoken @types/bcrypt @types/cookie-parser @types/multer @types/nodemailer @types/supertest @types/node`
- [X] T004 [P] Scaffold frontend with `ng new frontend --routing --style=scss --ssr=false --skip-git` (Angular 22, standalone, Vitest test runner), run `ng add @angular/material`, create `frontend/proxy.conf.json` mapping `/api` and `/uploads` to `http://localhost:3000`, and set `proxyConfig` for the `serve` target in `frontend/angular.json`
- [X] T005 [P] Add root `.prettierrc` (singleQuote, printWidth 100) and `backend/eslint.config.js` (typescript-eslint recommended); run `ng lint` setup (`ng add angular-eslint`) in `frontend/`
- [X] T006 Create `backend/.env.example` and `backend/src/config/env.ts` that parses `process.env` with Zod and exports typed `env`: `PORT` (default 3000), `DATABASE_URL`, `JWT_SECRET` (min 32 chars), `ACCESS_TOKEN_TTL_SECONDS` (default 900), `SESSION_TTL_DAYS` (default 7), `RESET_TOKEN_TTL_MINUTES` (default 60), `BCRYPT_COST` (default 12), `SMTP_HOST` (default `localhost`), `SMTP_PORT` (default 1025), `MAIL_FROM`, `APP_URL` (default `http://localhost:4200`), `COOKIE_SECURE` (default false), `SEED_PASSWORD` (default `Passw0rd!`); fail fast on invalid env

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: shared pieces every story uses. Only what US-01 already needs, per
constitution I.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create `backend/prisma/schema.prisma` (provider `postgresql`, `DATABASE_URL`) with enums `Role { STUDENT INSTRUCTOR ADMIN }` and `UserStatus { ACTIVE BLOCKED }` and model `User` mapped to table `users`: `id` uuid PK default uuid; `fullName` `@db.VarChar(100)` "Required, trimmed, 2–100 chars"; `email` `@unique @db.VarChar(254)` "Stored trimmed + lower-case (case-insensitive uniqueness)"; `passwordHash` `@db.VarChar(60)` "bcrypt hash, cost 12"; `role Role @default(STUDENT)`; `status UserStatus @default(ACTIVE)`; `photoPath` `String? @db.VarChar(255)`; `bio` `String? @db.VarChar(500)`; `createdAt` default now `@db.Timestamptz`; `updatedAt @updatedAt @db.Timestamptz`; use `@map` snake_case columns; run `npx prisma migrate dev --name init_users`
- [X] T008 [P] Create `backend/src/db/prisma.ts` exporting one `PrismaClient` with global `omit: { user: { passwordHash: true } }` so the hash is never selected unless explicitly requested
- [X] T009 [P] Create `backend/src/lib/clock.ts` with `now(): Date`, and test-only `setNow(date)`, `advance(ms)`, `resetClock()`; all time-based rules MUST use `now()`, never `new Date()` directly
- [X] T010 [P] Create `backend/src/lib/errors.ts` with `AppError(status, code, message, details?)` and a `ErrorCode` union of every code in `contracts/auth-api.md` (`VALIDATION_ERROR`, `INVALID_CURRENT_PASSWORD`, `UNAUTHENTICATED`, `INVALID_CREDENTIALS`, `SESSION_EXPIRED`, `FORBIDDEN`, `ACCOUNT_BLOCKED`, `EMAIL_TAKEN`, `LINK_EXPIRED`, `FILE_TOO_LARGE`, `UNSUPPORTED_FILE_TYPE`, `TOO_MANY_ATTEMPTS`, plus `NOT_FOUND`, `INTERNAL`)
- [X] T011 Create `backend/src/middleware/error-handler.ts`: converts `AppError` to `{ "error": { code, message, details? } }` with its status, unknown errors to `500 INTERNAL` (message "Something went wrong"), and a `notFound` handler (`404 NOT_FOUND`); MUST NOT log request bodies (they can contain passwords)
- [X] T012 [P] Create `backend/src/middleware/validate.ts`: `validate({ body?, params? })` runs Zod `.strict()` schemas, replaces `req.body` with parsed output, and on failure throws `400 VALIDATION_ERROR` with `details: [{ field, message }]`
- [X] T013 [P] Create `backend/src/lib/password.ts`: `hashPassword(plain)` with `bcrypt` cost `env.BCRYPT_COST`; `verifyPassword(plain, hash)`; `verifyAgainstDummy(plain)` that compares against a fixed precomputed hash (equal timing for unknown emails); and Zod `passwordRule` = string, min 8, regex `/[A-Za-z]/`, regex `/[0-9]/` with message "Password must be at least 8 characters with a letter and a number"
- [X] T014 [P] Create `backend/src/lib/tokens.ts`: `signAccessToken({ sub, role, sid })` (HS256, `expiresIn` `env.ACCESS_TOKEN_TTL_SECONDS`, `iat` from `now()`), `verifyAccessToken(token)` (returns claims or throws; checks expiry against `now()` via `clockTimestamp`), `randomToken()` (32 random bytes, base64url), `sha256Hex(value)`
- [X] T015 Create `backend/src/middleware/authenticate.ts` (reads `Authorization: Bearer`, verifies with `verifyAccessToken`, sets `req.auth = { userId, role, sessionId }`, else `401 UNAUTHENTICATED`) and `backend/src/middleware/require-role.ts` (`requireRole(...roles)` → `403 FORBIDDEN` when `req.auth.role` not in list); add `req.auth` typing in `backend/src/types/express.d.ts`
- [X] T016 Create `backend/src/app.ts` exporting `createApp(options?: { extraRouters?: Array<[path, Router]> })`: `helmet()`, `express.json({ limit: '100kb' })`, `cookieParser()`, static `/uploads` → `backend/uploads`, mount feature routers under `/api`, then `extraRouters`, `notFound`, `errorHandler`; create `backend/src/server.ts` that calls `createApp().listen(env.PORT)`
- [X] T017 Create `backend/prisma/seed.ts` (upsert by email, password `env.SEED_PASSWORD`): `admin@learnpath.local` ADMIN, `instructor@learnpath.local` INSTRUCTOR, `student@learnpath.local` STUDENT, `blocked@learnpath.local` STUDENT + BLOCKED; register it as `"prisma": { "seed": "tsx prisma/seed.ts" }` in `backend/package.json`
- [X] T018 Create backend test harness: `backend/vitest.config.ts` (`fileParallelism: false`, `setupFiles`, `globalSetup`); `backend/tests/helpers/global-setup.ts` (sets `DATABASE_URL` to `learnpath_test`, runs `prisma migrate reset --force --skip-seed`); `backend/tests/helpers/setup.ts` (truncate all tables and `resetClock()` before each test); `backend/tests/helpers/app.ts` (`api = supertest(createApp(...))`); `backend/tests/helpers/factories.ts` (`createUser({ email?, password?, role?, status? })` returning the user and plain password)
- [X] T019 [P] Create `backend/tests/helpers/mailpit.ts`: `clearMail()` (`DELETE http://localhost:8025/api/v1/messages`), `listMail()`, `latestMailTo(email)` returning subject and text body
- [X] T020 Configure frontend core in `frontend/src/app/app.config.ts` (`provideRouter(routes)`, `provideHttpClient(withInterceptors([]))`, `provideAnimationsAsync()`) and Material theme in `frontend/src/styles.scss`; create `frontend/src/app/core/api/api-error.ts` with `messageFor(error: HttpErrorResponse)` mapping each code to the exact texts in `contracts/ui-routes.md` ("Visible messages")
- [X] T021 [P] Create `frontend/src/app/core/auth/auth.service.ts` skeleton: signals `user`, `accessToken`; computed `isLoggedIn`, `role`; `setSession(authResponse)`, `clear()`; and `frontend/src/app/core/auth/role-home.ts` (`STUDENT → /my-learning`, `INSTRUCTOR → /my-courses`, `ADMIN → /admin/dashboard`); shared types `User`, `AuthResponse`, `Role` in `frontend/src/app/core/auth/auth.models.ts`
- [X] T022 [P] Create placeholder standalone components in `frontend/src/app/features/placeholders/` (`home`, `catalog`, `my-learning`, `my-courses`, `admin-dashboard`), each a heading and one line saying which epic delivers it; register routes `/`, `/catalog`, `/my-learning`, `/my-courses`, `/admin/dashboard` in `frontend/src/app/app.routes.ts` (no guards yet)
- [X] T023 Create `frontend/src/app/layout/header/header.component.ts` (Material toolbar: logo "LearnPath", Catalog link, Log in / Sign up for guests; collapses into a menu button below 600 px) and use it with `<router-outlet>` in `frontend/src/app/app.component.ts`

**Checkpoint**: `docker compose up -d`, `npm run dev`, `npm start` all run; `npm test` runs (0 tests) in both projects.

---

## Phase 3: User Story 1 - Register an account (Priority: P1) 🎯 MVP

**Goal**: a guest signs up, becomes a Student, is logged in and lands on `/catalog`.

**Independent Test**: register a new email on `/register`; land on `/catalog` logged in as Student.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [X] T024 [P] [US1] Write `backend/tests/integration/us01-register.test.ts` against `POST /api/auth/register`: S1 `201` with `accessToken`, `expiresIn: 900`, `user.role === 'STUDENT'`, `Set-Cookie` `lp_refresh` with `HttpOnly`, `SameSite=Strict`, `Path=/api/auth`; S2 duplicate email → `409 EMAIL_TAKEN` "Email already registered", including `' Ali@X.com '` after `ali@x.com`; S3 malformed email → `400 VALIDATION_ERROR` with `details[0].field === 'email'`; S4 `abc1234` (7 chars), `abcdefgh` (no digit), `12345678` (no letter) → `400`; S5 confirm mismatch → `400` field `confirmPassword`; S6 DB `password_hash` starts with `$2b$12$` and differs from the input, and no response body contains `password`/`passwordHash`; also `fullName` of 1 and 101 chars → `400`; no user row created on any failure
- [X] T025 [P] [US1] Write `frontend/src/app/features/auth/register/register.component.spec.ts`: S3/S4/S5 client-side errors shown and submit disabled; S2 `409` shows "Email already registered"; S1 success calls `AuthService.register`, stores user, navigates to `/catalog`; loading state disables the button while pending

### Implementation for User Story 1

- [X] T026 [US1] Add model `Session` to `backend/prisma/schema.prisma` mapped to `sessions`: `id` uuid PK "Carried in the access token as `sid`"; `userId` FK → `User.id` `onDelete: Cascade`, indexed; `refreshTokenHash` `@unique @db.Char(64)` "SHA-256 hex of the cookie value"; `createdAt` default now; `expiresAt` "`created_at + 7 days`; never extended"; `endedAt DateTime?`; all `@db.Timestamptz`; run `npx prisma migrate dev --name add_sessions`
- [X] T027 [P] [US1] Create `backend/src/modules/users/user.dto.ts` with `toUserDto(user)` → `{ id, fullName, email, role, photoUrl, bio }` (`photoUrl` = `/uploads/avatars/<file>` or `null`)
- [X] T028 [US1] Create `backend/src/modules/auth/session.service.ts`: `createSession(userId)` (token = `randomToken()`, store `sha256Hex(token)`, `expiresAt = now() + env.SESSION_TTL_DAYS`), `setRefreshCookie(res, token)` / `clearRefreshCookie(res)` (`lp_refresh`, `httpOnly`, `sameSite: 'strict'`, `path: '/api/auth'`, `secure: env.COOKIE_SECURE`, `maxAge` 7 days), `buildAuthResponse(user, sessionId)` → `{ accessToken: signAccessToken({ sub, role, sid }), expiresIn, user: toUserDto(user) }`
- [X] T029 [US1] Create `backend/src/modules/auth/auth.schemas.ts` with `registerSchema`: `fullName` trimmed 2–100; `email` trimmed, lower-cased, valid email, max 254; `password` = `passwordRule`; `confirmPassword` must equal `password` (error on path `confirmPassword`)
- [X] T030 [US1] Create `backend/src/modules/auth/auth.service.ts` with `register(input)`: if email exists → `409 EMAIL_TAKEN`; hash password; create user (role `STUDENT`, status `ACTIVE`); map Prisma unique violation `P2002` to `EMAIL_TAKEN` for races; create session; return user + refresh token
- [X] T031 [US1] Create `backend/src/modules/auth/auth.routes.ts` with `POST /auth/register` (`validate({ body: registerSchema })` → service → set cookie → `201` AuthResponse) and mount it in `backend/src/app.ts`
- [X] T032 [US1] Add `register(fullName, email, password, confirmPassword)` to `frontend/src/app/core/auth/auth.service.ts` (POST `/api/auth/register`, then `setSession`)
- [X] T033 [US1] Create `frontend/src/app/features/auth/register/register.component.ts|html|scss`: reactive form (full name 2–100, email, password with the same rule and message as the server, confirm match validator), Material fields with inline errors, server error via `messageFor`, spinner while pending, on success navigate `/catalog`; add route `/register` in `frontend/src/app/app.routes.ts` and a Sign up link in the header

**Checkpoint**: US1 tests green; manual steps 1–3 in [quickstart.md](quickstart.md) pass.

---

## Phase 4: User Story 2 - Log in (Priority: P1)

**Goal**: log in with role-based landing, silent 15-minute renewal for up to 7 days,
5-in-15-minutes block, Blocked accounts refused.

**Independent Test**: log in as each seed role and land on its home; fail 5× and see the block; log in as `blocked@learnpath.local` and see "Account blocked".

### Tests for User Story 2 ⚠️ (write first, must fail)

- [X] T034 [P] [US2] Write `backend/tests/integration/us02-login.test.ts`: S1–S3 `POST /api/auth/login` returns `200` with `user.role` STUDENT / INSTRUCTOR / ADMIN and sets `lp_refresh`; S4 wrong password and unknown email return identical status (`401`), code `INVALID_CREDENTIALS` and message "Invalid email or password"; S5 five wrong passwords then correct password → `429 TOO_MANY_ATTEMPTS` with `Retry-After`, further attempts while blocked do not extend it (`advance` 15 min from 5th failure → login succeeds), successful login clears the counter, unknown emails are blocked the same way; S6 `GET /api/users/me` with the access token → `200`, and `POST /api/auth/refresh` with the cookie → `200` new token; S7 Blocked user with correct password → `403 ACCOUNT_BLOCKED` "Account blocked", with wrong password → `401 INVALID_CREDENTIALS`; S8 user set to BLOCKED after login → refresh `403 ACCOUNT_BLOCKED`, session `ended_at` set, cookie cleared; FR-011: `advance` 16 min → access token `401 UNAUTHENTICATED`, refresh still `200`; `advance` 7 days + 1 min → refresh `401 SESSION_EXPIRED`; FR-011a: change role in DB → refreshed token and `user.role` carry the new role; two parallel refresh calls both return `200`
- [X] T035 [P] [US2] Write `frontend/src/app/core/auth/auth.interceptor.spec.ts` (with `HttpTestingController`): adds `Authorization: Bearer` to `/api/*` when a token exists; does not retry `/api/auth/*`; on `401` from two concurrent requests performs exactly **one** refresh then retries both with the new token; refresh `401` → `AuthService.clear()` and navigate `/login`; refresh `403 ACCOUNT_BLOCKED` → navigate `/login` with "Account blocked"
- [X] T036 [P] [US2] Write `frontend/src/app/features/auth/login/login.component.spec.ts`: S1–S3 navigate to `/my-learning`, `/my-courses`, `/admin/dashboard` by role (and to `returnUrl` when present and allowed); S4 shows "Invalid email or password"; S5 `429` with `Retry-After: 600` shows "Too many failed attempts. Try again in 10 minutes."; S7 shows "Account blocked"
- [X] T037 [P] [US2] Write `frontend/src/app/core/auth/auth.service.spec.ts`: `restore()` calls `POST /api/auth/refresh` once and sets user/token on `200`; stays guest on `401`; `refresh()` called twice concurrently sends one request

### Implementation for User Story 2

- [X] T038 [US2] Add model `LoginAttempt` to `backend/prisma/schema.prisma` mapped to `login_attempts`: `id` `BigInt @id @default(autoincrement())`; `email` `@db.VarChar(254)` "Normalised like `users.email`"; `attemptedAt` default now `@db.Timestamptz`; `@@index([email, attemptedAt])`; run `npx prisma migrate dev --name add_login_attempts`
- [X] T039 [US2] Create `backend/src/modules/auth/lockout.service.ts`: `checkBlock(email)` → `{ blocked, retryAfterSeconds }` ("Blocked when the 5 most recent failures for the email fall within 15 minutes of each other and now() < (most recent failure).attempted_at + 15 min"); `recordFailure(email)`; `clearFailures(email)`; delete rows older than 30 minutes on each check
- [X] T040 [US2] Add `loginSchema` (`email` trimmed + lower-cased, `password` non-empty string) to `backend/src/modules/auth/auth.schemas.ts` and `login(email, password)` to `backend/src/modules/auth/auth.service.ts` in this order: `checkBlock` → `429` (no record); load user with `passwordHash`; unknown email → `verifyAgainstDummy`, `recordFailure`, `401 INVALID_CREDENTIALS`; wrong password → `recordFailure`, `401`; status BLOCKED → `403 ACCOUNT_BLOCKED` (no session); else `clearFailures`, `createSession`
- [X] T041 [US2] Add `refresh(token)` to `backend/src/modules/auth/session.service.ts`: find session by `sha256Hex(token)`; missing, `endedAt` set or `expiresAt <= now()` → `401 SESSION_EXPIRED`; user BLOCKED → set `endedAt`, `403 ACCOUNT_BLOCKED`; else `buildAuthResponse` with the user's **current** role (session and expiry unchanged, no rotation)
- [X] T042 [US2] Add `POST /auth/login` (`200`, sets cookie; sets `Retry-After` on `429`) and `POST /auth/refresh` (`200`; clears cookie on `401`/`403`) to `backend/src/modules/auth/auth.routes.ts`
- [X] T043 [US2] Create `backend/src/modules/users/users.routes.ts` with `GET /users/me` (`authenticate` → load user → `toUserDto`) and mount it in `backend/src/app.ts`
- [X] T044 [US2] Add `login(email, password)`, `refresh()` (single-flight: share one in-flight observable) and `restore()` to `frontend/src/app/core/auth/auth.service.ts`; call `restore()` from `provideAppInitializer` in `frontend/src/app/app.config.ts`
- [X] T045 [US2] Create `frontend/src/app/core/auth/auth.interceptor.ts` (functional) implementing the "Interceptor behaviour" in `contracts/ui-routes.md`, and register it in `withInterceptors([authInterceptor])` in `frontend/src/app/app.config.ts`
- [X] T046 [US2] Create `frontend/src/app/features/auth/login/login.component.ts|html|scss` (email + password, error message area, spinner) navigating to `returnUrl` or `roleHome(role)`; add route `/login` and header Log in link

**Checkpoint**: US1 + US2 tests green; quickstart steps 4–7 pass.

---

## Phase 5: User Story 3 - Log out (Priority: P1)

**Goal**: logging out clears the login on this device and protected pages redirect to login.

**Independent Test**: log in, log out, open a protected page by URL → `/login`.

### Tests for User Story 3 ⚠️ (write first, must fail)

- [X] T047 [P] [US3] Write `backend/tests/integration/us03-logout.test.ts`: S1 `POST /api/auth/logout` with cookie → `204`, cookie cleared, session `ended_at` set, a following refresh with the same cookie → `401 SESSION_EXPIRED`; logout without cookie → `204`; a second session of the same user still refreshes `200`
- [X] T048 [P] [US3] Write `frontend/src/app/core/auth/auth.guards.spec.ts` (authGuard + guestGuard) and `frontend/src/app/layout/header/header.component.spec.ts` (logout): S1 clicking Log out calls `AuthService.logout()`, clears state and navigates `/`; S2 after logout `authGuard` redirects to `/login?returnUrl=%2Fprotected`; `guestGuard` sends a signed-in Student from `/login` to `/my-learning`

### Implementation for User Story 3

- [X] T049 [US3] Add `endSession(token)` to `backend/src/modules/auth/session.service.ts` and `POST /auth/logout` (always `204`, clears cookie) to `backend/src/modules/auth/auth.routes.ts`
- [X] T050 [US3] Add `logout()` to `frontend/src/app/core/auth/auth.service.ts` (POST `/api/auth/logout`, always `clear()` even if the request fails) and a Log out button for signed-in users in `frontend/src/app/layout/header/header.component.ts`
- [X] T051 [US3] Create `authGuard` and `guestGuard` in `frontend/src/app/core/auth/auth.guards.ts` per `contracts/ui-routes.md`; apply `guestGuard` to `/login` and `/register` in `frontend/src/app/app.routes.ts`

**Checkpoint**: US1–US3 green; quickstart step 8 passes.

---

## Phase 6: User Story 4 - Role-based access (Priority: P1)

**Goal**: API returns 401/403 correctly, Angular blocks wrong-role pages, menu per role.

**Independent Test**: as each role, open other roles' pages and call other roles' test endpoints → refused.

### Tests for User Story 4 ⚠️ (write first, must fail)

- [X] T052 [P] [US4] Write `backend/tests/integration/us04-access.test.ts` using `createApp({ extraRouters })` with test-only routes `GET /api/__test/student`, `/instructor`, `/admin` guarded by `authenticate` + `requireRole(<role>)`: S1 no header, malformed header, bad signature, and expired token (`advance` 16 min) → `401 UNAUTHENTICATED`, also for `GET /api/users/me`; S2 Student → `403 FORBIDDEN` on instructor and admin routes; each role → `200` on its own route; Admin is not implicitly allowed on student/instructor routes
- [X] T053 [P] [US4] Extend `frontend/src/app/core/auth/auth.guards.spec.ts` for `roleGuard`: guest → `/login`; S3 Student on `/admin/dashboard` → `/my-learning`, Instructor on `/my-learning` → `/my-courses`, Admin on `/my-courses` → `/admin/dashboard`; and extend `frontend/src/app/layout/header/header.component.spec.ts`: S4 menu items for Guest / Student / Instructor / Admin exactly match the Menu table in `contracts/ui-routes.md`

### Implementation for User Story 4

- [X] T054 [US4] Make `backend/tests/integration/us04-access.test.ts` pass: confirm `createApp` mounts `extraRouters` before `notFound`, and adjust `backend/src/middleware/authenticate.ts` / `require-role.ts` for any failing case (e.g. `Bearer` parsing, expired-token detection via `now()`)
- [X] T055 [US4] Add `roleGuard(...roles: Role[])` to `frontend/src/app/core/auth/auth.guards.ts` and apply it: `/my-learning` STUDENT, `/my-courses` INSTRUCTOR, `/admin/dashboard` ADMIN in `frontend/src/app/app.routes.ts`
- [X] T056 [US4] Build the role-based menu in `frontend/src/app/layout/header/header.component.ts|html` from a computed signal over `AuthService.role()`, matching the Menu table (Profile / Change password / Log out in a user menu)

**Checkpoint**: US1–US4 green (Sprint 1 scope complete); quickstart steps 9–10 pass.

---

## Phase 7: User Story 5 - View and edit my profile (Priority: P2)

**Goal**: view name, email (read-only), photo, bio; edit name, bio, photo (JPG/PNG ≤ 2 MB).

**Independent Test**: change name, bio and photo, save, reload → changes kept.

### Tests for User Story 5 ⚠️ (write first, must fail)

- [X] T057 [P] [US5] Write `backend/tests/integration/us05-profile.test.ts` (build image buffers in the test: tiny valid PNG, tiny valid JPEG, a JPEG header padded to 2 MB + 1 byte, GIF bytes named `photo.png`): S1 `GET /api/users/me` returns `fullName`, `email`, `photoUrl`, `bio`; `PATCH` with `email` → `400 VALIDATION_ERROR` and email unchanged; S2 `PATCH { fullName, bio }` → `200` and persisted, `bio: null` clears, `bio` of 501 chars and `fullName` of 1 char → `400`; S3 `PUT /api/users/me/photo` PNG and JPEG → `200` new `photoUrl`, `GET photoUrl` → `200`, previous file deleted from `backend/uploads/avatars/`; S4 oversize → `413 FILE_TOO_LARGE`, GIF → `415 UNSUPPORTED_FILE_TYPE`, and `photoUrl` unchanged after both
- [X] T058 [P] [US5] Write `frontend/src/app/features/profile/profile/profile.component.spec.ts`: S1 email shown read-only; S2 save shows "Profile updated" and updates `AuthService.user`; S4 selecting a 3 MB file or a `.gif` shows the limits message without uploading and keeps the current photo

### Implementation for User Story 5

- [X] T059 [US5] Create `backend/src/modules/users/users.schemas.ts` (`updateProfileSchema` strict: `fullName?` trimmed 2–100, `bio?` string ≤ 500 or `null`) and `backend/src/modules/users/users.service.ts` (`getMe`, `updateProfile`); add `PATCH /users/me` to `backend/src/modules/users/users.routes.ts`
- [X] T060 [US5] Create `backend/src/modules/users/photo-upload.ts`: Multer memory storage, `limits.fileSize = 2 * 1024 * 1024`, field `photo`; check magic bytes (JPEG `FF D8 FF`, PNG `89 50 4E 47`) → else `415`; map `LIMIT_FILE_SIZE` → `413 FILE_TOO_LARGE`; write `backend/uploads/avatars/<userId>-<randomToken>.<jpg|png>`, update `photoPath`, then delete the old file; add `PUT /users/me/photo` to `backend/src/modules/users/users.routes.ts`
- [X] T061 [US5] Create `frontend/src/app/features/profile/profile.service.ts` (`getMe`, `update`, `uploadPhoto` via `FormData`) and `frontend/src/app/features/profile/profile/profile.component.ts|html|scss` (avatar preview, read-only email, name and bio fields with counters, client-side file checks, snack bar "Profile updated", loading/error states); add route `/profile` with `authGuard`

**Checkpoint**: US5 green; quickstart steps 11–12 pass.

---

## Phase 8: User Story 6 - Change password (Priority: P2)

**Goal**: change password with the current one; other devices signed out, this one kept.

**Independent Test**: change password, log out, only the new password works.

### Tests for User Story 6 ⚠️ (write first, must fail)

- [X] T062 [P] [US6] Write `backend/tests/integration/us06-change-password.test.ts` with two sessions A and B for one user: S1 `POST /api/users/me/password` from A → `204`; login with old password `401`, with new `200`; refresh A → `200`, refresh B → `401 SESSION_EXPIRED`; S2 wrong current password → `400 INVALID_CURRENT_PASSWORD`, old password still works, B still refreshes; S3 new password `abcdefgh` or mismatched confirm → `400 VALIDATION_ERROR`, nothing changed; no token → `401`
- [X] T063 [P] [US6] Write `frontend/src/app/features/profile/change-password/change-password.component.spec.ts`: S1 success shows "Password changed" and clears the form; S2 `INVALID_CURRENT_PASSWORD` shows its message and does **not** trigger logout/refresh; S3 client-side rule and mismatch errors

### Implementation for User Story 6

- [X] T064 [US6] Add `changePasswordSchema` (`currentPassword` non-empty, `newPassword` = `passwordRule`, `confirmPassword` equal) to `backend/src/modules/users/users.schemas.ts` and `changePassword(userId, sessionId, input)` to `backend/src/modules/users/users.service.ts` (verify current → else `400 INVALID_CURRENT_PASSWORD`; in one transaction update hash and set `endedAt = now()` on the user's sessions where `id != sessionId` and `endedAt IS NULL`); add `POST /users/me/password` → `204`
- [X] T065 [US6] Create `frontend/src/app/features/profile/change-password/change-password.component.ts|html|scss` (three password fields, same rule validator as register, snack bar "Password changed"); add route `/profile/password` with `authGuard` and a link from the profile page

**Checkpoint**: US6 green; quickstart steps 13–14 pass.

---

## Phase 9: User Story 7 - Reset forgotten password (Priority: P3)

**Goal**: reset by emailed link, valid 1 hour, single use, no account leaking, all devices signed out.

**Independent Test**: request reset, open link from Mailpit, set new password, log in; reopen link → "Link expired".

### Tests for User Story 7 ⚠️ (write first, must fail)

- [X] T066 [P] [US7] Write `backend/tests/integration/us07-password-reset.test.ts` (uses `mailpit.ts`, `clearMail()` before each): S1 `POST /api/auth/password-reset/request` for registered, unknown and Blocked emails → identical `202` body; S2 registered email receives one mail whose link matches `${APP_URL}/reset-password/<token>`; unknown email receives none; S3 `GET /api/auth/password-reset/<token>` → `200 { valid: true }`, `POST …/confirm` → `204`, no `Set-Cookie`, login with new password `200`, every earlier session refresh → `401`; S4 reusing the token → `410 LINK_EXPIRED`; `advance` 61 min → `410`; requesting twice then using the first token → `410`, second works; confirm with invalid password → `400` and token still valid; reset of a Blocked user leaves status BLOCKED
- [X] T067 [P] [US7] Write `frontend/src/app/features/auth/forgot-password/forgot-password.component.spec.ts` (S1 always shows "If an account exists for this email, a reset link has been sent.") and `frontend/src/app/features/auth/reset-password/reset-password.component.spec.ts` (S3 valid token shows the form and on success navigates `/login` with "Password changed"; S4 `410` shows "Link expired" and a link to `/forgot-password`)

### Implementation for User Story 7

- [X] T068 [US7] Add model `PasswordResetToken` to `backend/prisma/schema.prisma` mapped to `password_reset_tokens`: `id` uuid PK; `userId` FK → `User.id` `onDelete: Cascade`, indexed; `tokenHash` `@unique @db.Char(64)` "SHA-256 hex of the link token"; `createdAt` default now; `expiresAt` "`created_at + 1 hour`"; `usedAt DateTime?`; all `@db.Timestamptz`; run `npx prisma migrate dev --name add_password_reset_tokens`
- [X] T069 [P] [US7] Create `backend/src/lib/mailer.ts`: Nodemailer SMTP transport from `env.SMTP_HOST`/`SMTP_PORT`, `sendPasswordResetEmail(to, link)` with subject "Reset your LearnPath password", text + HTML body stating the link expires in 1 hour
- [X] T070 [US7] Create `backend/src/modules/password-reset/password-reset.service.ts`: `request(email)` (normalise; if user exists: delete their unused tokens, create new token hash with `expiresAt = now() + env.RESET_TOKEN_TTL_MINUTES`, send mail **after** the response via `setImmediate`, log failures without the token); `check(token)` (valid when `usedAt IS NULL AND expiresAt > now()`, else `410 LINK_EXPIRED`); `confirm(token, newPassword)` (in one transaction: re-check, set `usedAt`, update hash, set `endedAt` on all the user's active sessions; status untouched)
- [X] T071 [US7] Create `backend/src/modules/password-reset/password-reset.schemas.ts` (`requestSchema { email }`, `confirmSchema { token, newPassword: passwordRule, confirmPassword }`, `tokenParam`) and `backend/src/modules/password-reset/password-reset.routes.ts` (`POST /auth/password-reset/request` → `202` fixed message, `GET /auth/password-reset/:token`, `POST /auth/password-reset/confirm` → `204`); mount in `backend/src/app.ts`
- [X] T072 [US7] Create `frontend/src/app/features/auth/forgot-password/forgot-password.component.ts|html|scss` (email field, fixed confirmation message); add route `/forgot-password` with `guestGuard` and a "Forgot password?" link on the login screen
- [X] T073 [US7] Create `frontend/src/app/features/auth/reset-password/reset-password.component.ts|html|scss`: on init `GET /api/auth/password-reset/:token`; show form or "Link expired" with a link to `/forgot-password`; on success navigate `/login` and show "Password changed"; add route `/reset-password/:token`

**Checkpoint**: all seven stories green; quickstart steps 15–17 pass.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [X] T074 [P] Create `specs/001-auth-accounts/checklists/traceability.md`: one row per acceptance scenario (US-01 S1 … US-07 S4) and per FR with the test file and test name that covers it; fix any gap found (constitution II, SC-006)
- [ ] T075 [P] Check every screen in `frontend/src/app/features/**` for loading, error and empty states and layout at 375 px and desktop; fix styles in the component `.scss` files
- [X] T076 [P] Security pass over `backend/src/**`: no `console.log`/logger call receives passwords, tokens or request bodies; `passwordHash` never in responses (grep responses in tests); `helmet` enabled; JSON body limit set; cookie flags as in research R5
- [X] T077 [P] Write root `README.md`: what LearnPath is, prerequisites, setup commands, link to `specs/001-auth-accounts/quickstart.md`
- [X] T078 Run `npm run lint`, `npm run typecheck` and `npm test` in `backend/`, and `ng lint` and `npm test` in `frontend/`; all clean
- [ ] T079 Run the full manual walkthrough in `specs/001-auth-accounts/quickstart.md` (steps 1–17) and record results in `specs/001-auth-accounts/checklists/traceability.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: no dependencies
- **Foundational (Phase 2)**: depends on Setup; blocks all stories
- **Stories (Phases 3–9)**: run **sequentially** in order US1 → US7 (constitution I: one story end to end before the next)
- **Polish (Phase 10)**: after all stories

### User Story Dependencies

- **US1**: after Foundational. Introduces `sessions` (register logs the user in).
- **US2**: needs US1 (`session.service`, `user.dto`, register screen patterns).
- **US3**: needs US2 (a login to end; interceptor).
- **US4**: needs US2 (tokens with roles) and US3 (`auth.guards.ts` exists).
- **US5, US6**: need US4 (`authGuard`, `/api/users/me`). US6 is independent of US5 except for the link from the profile page (T065).
- **US7**: needs US2 (login, sessions); independent of US5/US6.

### Within Each Story

- Test tasks first; run them and confirm they **fail**
- Schema/migration → services → routes → frontend service → components/routes
- Story checkpoint (tests green + quickstart steps) before starting the next story

### Parallel Opportunities

- Setup: T004 and T005 alongside T003
- Foundational: T008, T009, T010, T012, T013, T014, T019, T021, T022 in parallel after T007
- In each story, the backend and frontend test tasks marked [P] can be written in parallel
- T027 (US1) and T069 (US7) are independent files

---

## Parallel Example: User Story 2

```bash
# Write the failing tests together:
Task: "Write backend/tests/integration/us02-login.test.ts"
Task: "Write frontend/src/app/core/auth/auth.interceptor.spec.ts"
Task: "Write frontend/src/app/features/auth/login/login.component.spec.ts"
Task: "Write frontend/src/app/core/auth/auth.service.spec.ts"

# Then backend (T038 → T043) and frontend (T044 → T046) can proceed side by side.
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 (register)
3. **STOP and VALIDATE**: US1 tests green, quickstart steps 1–3
4. Demo sign-up

### Incremental Delivery

1. Setup + Foundational
2. US1 → US2 → US3 → US4: matches Sprint 1 of the source build order ("People can sign in"); good point to merge
3. US5 → US6 → US7: the Should/Could stories brought forward by the clarification session
4. Polish, then merge `001-auth-accounts` into `master`

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- Test names start with `US-0N Sx` so `checklists/traceability.md` can be checked
- Commit after each task or logical group; commit at every checkpoint at minimum
- Never use `new Date()` for rule timing in backend code; use `now()` from `backend/src/lib/clock.ts`
