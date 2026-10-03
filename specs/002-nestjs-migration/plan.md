# Implementation Plan: Move the API to NestJS

**Branch**: `002-nestjs-migration` | **Date**: 2026-10-04 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-nestjs-migration/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Rebuild the EP-01 API (11 endpoints) on NestJS inside `backend/` without changing anything a
client can observe, as required by constitution 2.0.0 before EP-02. The 001 API tests are the
contract: first they move from Vitest to Jest while the API is still Express (72/72 green),
then a Nest skeleton is added and the three feature modules move one at a time (auth → users →
password reset), each gated by its tests. Input rules become class-validator DTOs whose error
output is mapped back to the 001 `VALIDATION_ERROR` shape; one exception filter keeps the 001
error contract; a global JWT guard plus `@Roles` replace the Express middleware. Swagger is
generated from decorators at `/api/docs` and `/api/openapi.json` (dev only), replacing the
hand-written document. Finally Express-only code, Zod and Vitest are removed. Database, Prisma
schema, migrations and the web app are untouched. Details: [research.md](research.md).

## Technical Context

**Language/Version**: TypeScript 6 on Node.js 24; backend switches from ESM to CommonJS (research R2)

**Primary Dependencies**: NestJS 12 (`@nestjs/core`, `common`, `platform-express`, `config`,
`swagger`, `testing`), `class-validator` 0.15, `class-transformer` 0.5, Prisma 7 + `@prisma/adapter-pg`,
`jsonwebtoken`, `bcrypt`, `nodemailer`, `helmet`, `cookie-parser`, Multer (via `@nestjs/platform-express`)

**Storage**: PostgreSQL 17 (unchanged), local disk `backend/uploads/` (unchanged)

**Testing**: Jest 30 + `@swc/jest`, Supertest against `app.getHttpServer()`, real test database
and Mailpit (as in 001); frontend stays on Angular's Vitest runner

**Target Platform**: Node.js server; same port 3000 and `.env`

**Project Type**: Web application (Angular SPA + REST API); only the API changes

**Performance Goals**: no regression versus 001 (login round trip < 1 s p95 locally)

**Constraints**: zero client-visible change (contract: [contracts/api-compatibility.md](contracts/api-compatibility.md));
no database change; docs only outside production; each module gated by its existing tests

**Scale/Scope**: 11 endpoints, 3 feature modules, 6 request DTOs, 59 EP-01 API tests (58 story
tests + harness) + new compat, docs and structure tests

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | How this plan complies | Status |
|---|---|---|
| I. Vertical Slice Delivery | Technical story (no screen): done when its acceptance criteria are tested and all existing tests still pass, per the TS clause added in 2.0.0. Work is sliced by feature module, each closed by its tests. | ✅ Pass |
| II. Every Acceptance Criterion Is Tested | 001 tests guard US-01..US-07 unchanged; new tests for docs incl. OpenAPI validity (SC-004/005), production hiding (FR-014), `@Roles` via a test controller (FR-010), legacy-token compatibility (FR-005), and an automated `structure.test.ts` for US3 (FR-016/017, SC-007). | ✅ Pass |
| III. Secure Authentication | bcrypt and JWT code reused as-is; DTO validation on every body with `forbidNonWhitelisted`; filter never logs bodies. | ✅ Pass |
| IV. Role-Based Access on Both Sides | Global `JwtAuthGuard` (401) + `RolesGuard` with `@Roles` on endpoints (403), exactly the 2.0.0 wording; Angular guards untouched. | ✅ Pass |
| V. Phase-Scoped Simplicity | No new features. Rejected extra layers: Passport, `@nestjs/jwt`, `nestjs-prisma`, Swagger CLI plugin, Fastify. | ✅ Pass |
| Technology Constraints | Node.js + NestJS, one module per feature; transition rule satisfied (TS-01 before EP-02). | ✅ Pass |

**Post-design re-check (after Phase 1)**: ✅ all pass. The CommonJS switch (R2) and the
custom validation `exceptionFactory` (R4) are required by the clarified decisions (Jest,
class-validator) and FR-002, not added complexity.

## Project Structure

### Documentation (this feature)

```text
specs/002-nestjs-migration/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command) — no data changes
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   └── api-compatibility.md
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── nest-cli.json                    # builder: swc, typeCheck
├── jest.config.ts                   # @swc/jest, runInBand, .js mapper, globalSetup/setupFilesAfterEnv
├── prisma/                          # unchanged except generator moduleFormat = "cjs"
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── scripts/
│   └── export-openapi.ts            # builds app, writes openapi.json via SwaggerModule
├── src/
│   ├── main.ts                      # NestFactory.create + configureApp + listen
│   ├── app.module.ts                # Config, Prisma, Mail, Auth, Users, PasswordReset; APP_GUARD/APP_FILTER/APP_PIPE
│   ├── app.setup.ts                 # configureApp(app): prefix, helmet, cookies, static, swagger — shared by main, tests, export
│   ├── config/
│   │   ├── env.validation.ts        # EnvironmentVariables (class-validator) + exported `env`
│   │   └── paths.ts                 # unchanged
│   ├── common/
│   │   ├── errors.ts                # AppError, Errors (moved from lib/)
│   │   ├── filters/all-exceptions.filter.ts
│   │   ├── pipes/validation.pipe.ts # ValidationPipe + exceptionFactory → VALIDATION_ERROR details
│   │   ├── guards/jwt-auth.guard.ts
│   │   ├── guards/roles.guard.ts
│   │   ├── decorators/              # public, roles, current-user, match (confirm fields)
│   │   └── dto/error-response.dto.ts
│   ├── lib/                         # unchanged helpers: clock.ts, password.ts, tokens.ts
│   ├── prisma/
│   │   ├── prisma.module.ts         # @Global
│   │   └── prisma.service.ts
│   ├── mail/
│   │   ├── mail.module.ts
│   │   └── mail.service.ts          # from lib/mailer.ts
│   ├── generated/prisma/            # gitignored, generated
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts   # register, login, refresh, logout
│       │   ├── auth.service.ts
│       │   ├── session.service.ts
│       │   ├── lockout.service.ts
│       │   └── dto/                 # register.dto.ts, login.dto.ts, auth-response.dto.ts
│       ├── users/
│       │   ├── users.module.ts
│       │   ├── users.controller.ts  # me, profile, photo, password
│       │   ├── users.service.ts
│       │   ├── photo.service.ts     # magic bytes + file write (from photo-upload.ts)
│       │   ├── user.dto.ts          # toUserDto (unchanged)
│       │   └── dto/                 # update-profile.dto.ts, change-password.dto.ts, user-response.dto.ts
│       └── password-reset/
│           ├── password-reset.module.ts
│           ├── password-reset.controller.ts
│           ├── password-reset.service.ts
│           └── dto/                 # reset-request.dto.ts, reset-confirm.dto.ts
└── tests/
    ├── helpers/                     # app.ts builds the Nest app via Test.createTestingModule + configureApp
    └── integration/                 # us01…us07 unchanged in what they check; openapi.test.ts rewritten for Swagger

Removed at the end: src/app.ts, src/server.ts, src/middleware/, src/modules/*/*.routes.ts,
src/modules/*/*.schemas.ts, src/docs/openapi.ts, src/config/env.ts (Zod), vitest.config.ts,
dependencies zod and vitest.
```

**Structure Decision**: standard NestJS layout inside the existing `backend/` folder
(clarification 2026-10-03): `main.ts` + `app.module.ts`, shared `common/`, global
infrastructure modules (`prisma/`, `mail/`, config), and one folder per feature under
`modules/`. The 001 services, `lib/` helpers and `toUserDto` move with minimal edits (become
`@Injectable()` classes, take `PrismaService` by injection) so behaviour stays identical.
`app.setup.ts` holds every app-level setting in one function used by `main.ts`, the tests and
the OpenAPI export, so the three never differ.

## Build Order (FR-017a/b)

| Step | Delivers | Gate |
|---|---|---|
| 1 | CommonJS switch + Jest replaces Vitest; API still Express (CJS first so Jest never meets the ESM Prisma client) | 72/72 backend tests on Jest |
| 2 | Nest skeleton, common/ (filter, pipe, guards, decorators), Prisma/Config/Mail modules; tests start the Nest app | harness 404 test |
| 3 | Auth module (register, login, refresh, logout) | US-01, US-02, US-03 |
| 4 | Users module (me, profile, photo, password) + `@Roles` test controller | US-01 … US-06 |
| 5 | Password-reset module | all 59 EP-01 tests |
| 6 | Swagger docs + doc tests (replace hand-written OpenAPI and its 13 tests; validate with swagger-parser); `structure.test.ts`; delete Express/Zod/Vitest; scripts; quickstart | full suite incl. structure test, lint, build, walkthrough |

## Complexity Tracking

No constitution violations; nothing to justify.
