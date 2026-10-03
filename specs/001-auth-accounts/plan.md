# Implementation Plan: Authentication & Accounts

**Branch**: `001-auth-accounts` | **Date**: 2026-09-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-auth-accounts/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Build the account foundation of LearnPath (US-01 → US-07): register, log in with a
per-email failed-attempt block, log out, role-based access on API and UI, profile with
photo, change password, and email-based password reset. This is the first feature, so it
also scaffolds the `backend/` (Express + TypeScript + Prisma) and `frontend/` (Angular 22)
projects, Docker services (PostgreSQL, Mailpit), and the test setups every later feature
reuses.

Technical approach ([research.md](research.md)): 15-minute JWT access token held in memory +
7-day opaque refresh token in an `HttpOnly` cookie backed by a `sessions` table, so role
changes, blocks, logout and password changes take effect at the next renewal. bcrypt for
passwords, Zod for validation, one error format, Vitest on both sides.

## Technical Context

**Language/Version**: TypeScript 5.x on Node.js 24 LTS (backend); TypeScript with Angular 22 (frontend)

**Primary Dependencies**: Express 5, Prisma ORM, Zod, jsonwebtoken, bcrypt, cookie-parser,
Multer, Nodemailer, helmet (backend) · Angular 22, Angular Material, RxJS (frontend)

**Storage**: PostgreSQL 17 (Docker in dev/test); local disk `backend/uploads/` for photos

**Testing**: Vitest + Supertest against a real test database and Mailpit (backend);
Angular CLI Vitest runner with `HttpTestingController` (frontend)

**Target Platform**: Linux/Windows server for the API; evergreen browsers, 375 px mobile
width to desktop

**Project Type**: Web application (Angular SPA + REST API)

**Performance Goals**: login/register round trip < 1 s p95 locally (bcrypt cost 12 ≈ 250 ms);
supports SC-001 (register < 1 min) and SC-002 (login < 15 s) with large margin

**Constraints**: no plaintext passwords anywhere (logs included); identical responses for
known/unknown emails on login failure and forgot-password; photo ≤ 2 MB JPG/PNG; access
token TTL 15 min, session TTL 7 days, reset link TTL 1 h, block 5 failures / 15 min

**Scale/Scope**: Phase 1: hundreds of users; single API instance; 11 routes, 8 screens,
11 endpoints

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan complies | Status |
|---|---|---|
| I. Vertical Slice Delivery | Tasks are grouped per story (US-01 … US-07); each group delivers endpoint + screen + tests before the next. Shared scaffolding is limited to what US-01 itself needs. | ✅ Pass |
| II. Every Acceptance Criterion Is Tested | Each acceptance scenario maps to ≥1 named test (`US-0N Sx`); API rules in Supertest, screen rules in Angular tests ([quickstart.md](quickstart.md)). | ✅ Pass |
| III. Secure Authentication | bcrypt cost 12; JWT access token attached by functional interceptor and cleared on logout; Zod validation on every endpoint; password never logged or returned. | ✅ Pass |
| IV. Role-Based Access on Both Sides | `authenticate` → 401, `requireRole` → 403 on the API; `authGuard` / `roleGuard` + role-based menu in Angular ([contracts/ui-routes.md](contracts/ui-routes.md)). | ✅ Pass |
| V. Phase-Scoped Simplicity | Only EP-01 scope; later pages are placeholders. Refresh sessions are extra machinery but required by clarified FR-011 – FR-011c; no rotation, no NgRx, no repository layer. | ✅ Pass |
| Technology Constraints | Angular, Node.js + Express, PostgreSQL, JWT — as mandated. | ✅ Pass |

**Post-design re-check (after Phase 1)**: ✅ all pass. The data model adds `sessions`,
`login_attempts` and `password_reset_tokens`; each is required by a functional requirement
(FR-011/012, FR-010, FR-022–026). No unjustified complexity.

## Project Structure

### Documentation (this feature)

```text
specs/001-auth-accounts/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── auth-api.md
│   └── ui-routes.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
docker-compose.yml               # postgres:17, axllent/mailpit
backend/
├── prisma/
│   ├── schema.prisma            # users, sessions, login_attempts, password_reset_tokens
│   ├── migrations/
│   └── seed.ts                  # admin / instructor / student / blocked
├── src/
│   ├── server.ts                # listen
│   ├── app.ts                   # express app factory (used by tests)
│   ├── config/env.ts            # Zod-validated env
│   ├── db/prisma.ts
│   ├── lib/
│   │   ├── errors.ts            # AppError + codes
│   │   ├── password.ts          # bcrypt hash/compare, dummy hash
│   │   ├── tokens.ts            # JWT sign/verify, random token + sha256
│   │   ├── clock.ts             # now(), overridable in tests
│   │   └── mailer.ts            # nodemailer transport
│   ├── middleware/
│   │   ├── authenticate.ts      # 401
│   │   ├── require-role.ts      # 403
│   │   ├── validate.ts          # Zod → 400
│   │   └── error-handler.ts     # uniform error body
│   └── modules/
│       ├── auth/                # register, login, refresh, logout, lockout
│       │   ├── auth.routes.ts
│       │   ├── auth.service.ts
│       │   ├── auth.schemas.ts
│       │   └── session.service.ts
│       ├── users/               # me, profile, photo, change password
│       │   ├── users.routes.ts
│       │   ├── users.service.ts
│       │   └── users.schemas.ts
│       └── password-reset/
│           ├── password-reset.routes.ts
│           ├── password-reset.service.ts
│           └── password-reset.schemas.ts
├── uploads/avatars/             # gitignored
└── tests/
    ├── helpers/                 # test app, db reset, mailpit client, clock
    └── integration/             # us01-register.test.ts … us07-reset.test.ts

frontend/
├── proxy.conf.json              # /api, /uploads → localhost:3000
└── src/app/
    ├── app.config.ts            # provideHttpClient(withInterceptors), app initializer
    ├── app.routes.ts
    ├── core/
    │   ├── auth/
    │   │   ├── auth.service.ts      # signals: user, accessToken; login/register/refresh/logout
    │   │   ├── auth.interceptor.ts  # bearer + single-flight refresh
    │   │   ├── auth.guards.ts       # authGuard, guestGuard, roleGuard
    │   │   └── role-home.ts
    │   └── api/api-error.ts         # maps error codes → messages
    ├── layout/header/               # role-based menu
    └── features/
        ├── auth/                    # register, login, forgot-password, reset-password
        ├── profile/                 # profile, change-password
        └── placeholders/            # home, catalog, my-learning, my-courses, admin-dashboard
    (tests: *.spec.ts next to each file)
```

**Structure Decision**: web application with two sibling projects, `backend/` and
`frontend/`, plus a root `docker-compose.yml`. Each project has its own `package.json`
(no workspace tooling needed yet). Backend code is grouped by module (auth, users,
password-reset) rather than by layer, so each story touches one folder. The Angular dev
server proxies `/api` and `/uploads` so the SPA and API share one origin, which the
`SameSite=Strict` refresh cookie relies on.

## Build Order (per constitution I)

| Step | Story | Delivers |
|---|---|---|
| 0 | Setup | Docker services, backend + frontend scaffolds, Prisma `users` table, error handler, test harnesses, placeholder pages |
| 1 | US-01 | Register endpoint + sign-up screen + tests |
| 2 | US-02 | Login, `sessions`, refresh, `login_attempts`, Blocked check, role redirect, interceptor + tests |
| 3 | US-03 | Logout endpoint + header action + guard redirect + tests |
| 4 | US-04 | `authenticate` / `requireRole` hardening, `roleGuard`, role menu + tests |
| 5 | US-05 | Profile get/patch/photo + profile screen + tests |
| 6 | US-06 | Change password (+ end other sessions) + screen + tests |
| 7 | US-07 | `password_reset_tokens`, mailer, forgot/reset screens + tests |

## Complexity Tracking

No constitution violations; nothing to justify.
