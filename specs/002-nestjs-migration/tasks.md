---

description: "Task list for 002-nestjs-migration (TS-01 Move the API from Express to NestJS)"
---

# Tasks: Move the API to NestJS

**Input**: Design documents from `/specs/002-nestjs-migration/`

**Prerequisites**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md),
[data-model.md](data-model.md), [contracts/api-compatibility.md](contracts/api-compatibility.md),
[quickstart.md](quickstart.md); behaviour baseline
[001 auth-api.md](../001-auth-accounts/contracts/auth-api.md)

**Tests**: REQUIRED (constitution II). The 001 API tests in `backend/tests/integration/us0*.test.ts`
are the contract: after T006 only their runner syntax and app start-up may change, never what
they assert. New tests are written first for new behaviour (compatibility edges, docs, roles).

**Organization**: the build order is by module (auth → users → password reset, FR-017a); those
steps all serve [US1] "nothing changes". [US2] = generated docs, [US3] = one structure / old
code removed.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 = nothing changes for users, US2 = docs from code, US3 = one clear structure
- Paths are relative to the repository root

---

## Phase 1: Setup — CommonJS + Jest on the Express API (FR-017b)

**Purpose**: move the safety net to Jest before any Nest code exists. Gate: 72/72 on Jest.

- [ ] T001 Switch `backend/` to CommonJS: remove `"type": "module"` from `backend/package.json`; keep `"module": "nodenext"` and `"moduleResolution": "nodenext"` in `backend/tsconfig.json` and add `"experimentalDecorators": true` and `"emitDecoratorMetadata": true`; add `moduleFormat = "cjs"` to the `generator client` block in `backend/prisma/schema.prisma` (no model changes); run `npm --prefix backend run db:generate`; rename `backend/eslint.config.js` → `backend/eslint.config.mjs`; confirm `npm --prefix backend run dev` starts the Express API and `npx prisma db seed` still works
- [ ] T002 Install test runner in `backend/`: `npm i -D jest @types/jest @swc/jest @swc/core` (keep `vitest` installed until T047)
- [ ] T003 Create `backend/jest.config.ts`: `testEnvironment: 'node'`, `roots: ['<rootDir>/tests']`, `testMatch: ['**/*.test.ts']`, `transform: { '^.+\\.ts$': ['@swc/jest', { jsc: { parser: { syntax: 'typescript', decorators: true }, transform: { legacyDecorator: true, decoratorMetadata: true }, target: 'es2023' } }] }`, `moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' }`, `globalSetup: '<rootDir>/tests/helpers/global-setup.ts'`, `setupFiles: ['<rootDir>/tests/helpers/jest-env.ts']`, `setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.ts']`, `testTimeout: 20000`
- [ ] T004 [P] Create `backend/tests/helpers/jest-env.ts` setting `process.env.DATABASE_URL = 'postgresql://learnpath:learnpath@localhost:5433/learnpath_test'`, `BCRYPT_COST = '4'`, `APP_URL = 'http://localhost:4200'`, `UPLOADS_DIR = path.join(os.tmpdir(), 'learnpath-test-uploads')` (same values as `backend/vitest.config.ts`)
- [ ] T005 Port test helpers to Jest globals: in `backend/tests/helpers/setup.ts` drop the `vitest` import (use Jest `beforeEach`/`afterAll`); make `backend/tests/helpers/global-setup.ts` a CommonJS-compatible default export (`export default async function`)
- [ ] T006 Port every test file to Jest syntax only: remove `import { … } from 'vitest'` from `backend/tests/integration/harness.test.ts`, `openapi.test.ts`, `us01-register.test.ts`, `us02-login.test.ts`, `us03-logout.test.ts`, `us04-access.test.ts`, `us05-profile.test.ts`, `us06-change-password.test.ts`, `us07-password-reset.test.ts`; change no `expect(…)` line
- [ ] T007 Set `"test": "jest --runInBand"` in `backend/package.json`; run `npm run test:api` from the root → **gate: 72/72 pass on Jest against Express**; record the `git diff --stat -- backend/tests` (imports only)

**Checkpoint**: Jest is the safety net; Express still serves the API.

---

## Phase 2: Foundational — Nest skeleton and shared pieces

**Purpose**: everything every module needs. No endpoint moves yet.

**⚠️ CRITICAL**: No module migration can begin until this phase is complete

- [ ] T008 Install in `backend/`: `@nestjs/common @nestjs/core @nestjs/platform-express @nestjs/config @nestjs/swagger class-validator class-transformer reflect-metadata` and dev `@nestjs/cli @nestjs/testing @nestjs/schematics`; create `backend/nest-cli.json` (`"sourceRoot": "src"`, `"compilerOptions": { "builder": "swc", "typeCheck": true, "deleteOutDir": true }`)
- [ ] T009 [P] Move `backend/src/lib/errors.ts` → `backend/src/common/errors.ts` unchanged (`AppError`, `ErrorCode`, `Errors`); update imports in `backend/src` and `backend/tests`; move `TooManyAttemptsError` (with `retryAfterSeconds`) from `backend/src/modules/auth/auth.service.ts` into `backend/src/common/errors.ts`
- [ ] T010 [P] Create `backend/src/config/env.validation.ts`: class `EnvironmentVariables` with class-validator rules and the same keys/defaults as `backend/src/config/env.ts` (`PORT` 3000, `DATABASE_URL` required, `JWT_SECRET` min 32, `ACCESS_TOKEN_TTL_SECONDS` 900, `SESSION_TTL_DAYS` 7, `RESET_TOKEN_TTL_MINUTES` 60, `BCRYPT_COST` 4–15 default 12, `SMTP_HOST` localhost, `SMTP_PORT` 1025, `MAIL_FROM`, `APP_URL` default http://localhost:4200, `COOKIE_SECURE` false, `SEED_PASSWORD` Passw0rd!), a `validateEnv(raw)` function using `plainToInstance` + `validateSync` that throws on error, and an exported `env = validateEnv(process.env)` (after `import 'dotenv/config'`) for code outside DI
- [ ] T011 [P] Create `backend/src/prisma/prisma.service.ts` (`@Injectable() class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy`, constructed with `new PrismaPg({ connectionString: env.DATABASE_URL })` and `omit: { user: { passwordHash: true } }`) and `backend/src/prisma/prisma.module.ts` (`@Global()`, exports `PrismaService`)
- [ ] T012 [P] Create `backend/src/mail/mail.service.ts` (`@Injectable()`, body of `backend/src/lib/mailer.ts` `sendPasswordResetEmail` unchanged) and `backend/src/mail/mail.module.ts` (`@Global()`, exports `MailService`)
- [ ] T013 [P] Create decorators in `backend/src/common/decorators/`: `public.decorator.ts` (`IS_PUBLIC_KEY`, `@Public()`), `roles.decorator.ts` (`ROLES_KEY`, `@Roles(...roles: Role[])`), `current-user.decorator.ts` (`@CurrentUser()` → `request.auth`), `match.decorator.ts` (`@Match(property, options)` class-validator constraint: value equals `object[property]`)
- [ ] T014 [P] Create `backend/src/common/guards/jwt-auth.guard.ts`: skip when `@Public()`; read `Authorization: Bearer <token>` with the regex from `backend/src/middleware/authenticate.ts`; `verifyAccessToken` from `backend/src/lib/tokens.ts`; set `request.auth = { userId, role, sessionId }`; otherwise throw `Errors.unauthenticated()`
- [ ] T015 [P] Create `backend/src/common/guards/roles.guard.ts`: read `@Roles` via `Reflector.getAllAndOverride`; none → allow; `request.auth` missing → `Errors.unauthenticated()`; role not listed → `Errors.forbidden()`
- [ ] T016 [P] Create `backend/src/common/pipes/validation.pipe.ts`: `new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory })` where `exceptionFactory(errors)` flattens nested `ValidationError`s to `details = [{ field: error.property, message }]` (one per failed constraint, property order) and returns `new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', details)`
- [ ] T017 Write `backend/tests/integration/compat.test.ts` (fails until T018/T019) for contract §2 of `contracts/api-compatibility.md`: unknown route → `404 { error: { code: 'NOT_FOUND', message: 'Not found' } }`; malformed JSON body on `POST /api/auth/login` → `400 VALIDATION_ERROR "Request body is not valid JSON"`; body over 100 kb → `400 VALIDATION_ERROR`; response bodies never contain `statusCode`
- [ ] T018 Create `backend/src/common/filters/all-exceptions.filter.ts` (`@Catch()`): `AppError` → its status + `{ error: { code, message, details? } }`, plus `Retry-After` for `TooManyAttemptsError`; `NotFoundException` → `404 NOT_FOUND "Not found"`; body-parser errors (`type === 'entity.parse.failed'` / `'entity.too.large'`) → `400 VALIDATION_ERROR "Request body is not valid JSON"`; `PayloadTooLargeException` → `Errors.fileTooLarge()`; anything else → log `method path` + stack (never the body) and `500 INTERNAL "Something went wrong"`
- [ ] T019 Create `backend/src/app.setup.ts` exporting `configureApp(app: NestExpressApplication)`: `app.setGlobalPrefix('api')`, `app.disable('x-powered-by')`, `helmet({ crossOriginResourcePolicy: { policy: 'same-origin' } })`, `cookieParser()`, `app.useBodyParser('json', { limit: '100kb' })`, `app.useStaticAssets(uploadsDir, { prefix: '/uploads', index: false })`; create `backend/src/app.module.ts` with `ConfigModule.forRoot({ isGlobal: true, validate: validateEnv })`, `PrismaModule`, `MailModule`, providers `APP_GUARD` → `JwtAuthGuard` then `RolesGuard`, `APP_FILTER` → `AllExceptionsFilter`, `APP_PIPE` → the pipe from T016; create `backend/src/main.ts` (`NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false })`, `configureApp`, `listen(env.PORT)`)
- [ ] T020 Rewrite `backend/tests/helpers/app.ts` to start the Nest app once per test file: `initApp(options?: { controllers?: Type[] })` builds `Test.createTestingModule({ imports: [AppModule], controllers })`, `createNestApplication<NestExpressApplication>({ bodyParser: false })`, `configureApp`, `init()`; export `api` as an object with `get/post/put/patch/delete` that call `supertest(app.getHttpServer())` lazily, so test files keep `api.post(...)` unchanged; call `initApp()` in `beforeAll` and `app.close()` in `afterAll` inside `backend/tests/helpers/setup.ts`; keep `refreshCookieFrom` unchanged
- [ ] T021 Run `npm run test:api -- harness compat` → **gate: harness + compat green against the Nest app** (feature tests are expected to fail until their module moves)

**Checkpoint**: Nest app starts, shared error/validation/guards in place.

---

## Phase 3: User Story 1 - Nothing changes for people using LearnPath (Priority: P1) 🎯 MVP

**Goal**: all 11 endpoints served by Nest modules with identical behaviour.

**Independent Test**: every 001 API test passes against the Nest app with unchanged assertions; 0 frontend files changed.

### Tests for User Story 1 ⚠️ (write first, must fail)

- [ ] T022 [P] [US1] Write `backend/tests/integration/compat-tokens.test.ts` for FR-005/SC-006: an access token signed by `signAccessToken` from `backend/src/lib/tokens.ts` with the current `JWT_SECRET` (as the Express API issued) is accepted by `GET /api/users/me`; a session row + cookie created through `createSession` keeps renewing via `POST /api/auth/refresh`
- [ ] T023 [P] [US1] Add success-code checks to `backend/tests/integration/compat.test.ts`: login `200`, refresh `200`, logout `204`, register `201`, reset request `202`, reset confirm `204`, password change `204` (contract §2 last row — Nest defaults POST to `201`)

### Module: auth (US-01, US-02, US-03)

- [ ] T024 [P] [US1] Create `backend/src/modules/auth/dto/register.dto.ts` (`fullName`: `@Transform(trim)` `@IsString()` `@Length(2, 100, { message: 'Full name must be 2–100 characters' })`; `email`: `@Transform(trim + toLowerCase)` `@IsString()` `@MaxLength(254, { message: 'Email is too long' })` `@IsEmail({}, { message: 'Enter a valid email' })`; `password`: `@IsString()` `@MinLength(8)` `@Matches(/[A-Za-z]/)` `@Matches(/[0-9]/)` all with message `PASSWORD_RULE_MESSAGE` from `backend/src/lib/password.ts`; `confirmPassword`: `@IsString()` `@Match('password', { message: 'Passwords do not match' })`) and `backend/src/modules/auth/dto/login.dto.ts` (`email`: trim + lowercase, `@IsString()` `@IsNotEmpty({ message: 'Email is required' })` `@MaxLength(254)`; `password`: `@IsString()` `@IsNotEmpty({ message: 'Password is required' })` `@MaxLength(200)`)
- [ ] T025 [P] [US1] Convert `backend/src/modules/auth/lockout.service.ts` to `@Injectable() LockoutService` using injected `PrismaService` (logic, constants and the "5 most recent failures within 15 minutes, block until most recent + 15 min" rule unchanged)
- [ ] T026 [US1] Convert `backend/src/modules/auth/session.service.ts` to `@Injectable() SessionService` with injected `PrismaService`; keep `REFRESH_COOKIE`, cookie options, `createSession`, `refresh`, `endSession`, `setRefreshCookie`, `clearRefreshCookie`, `buildAuthResponse` behaviour identical
- [ ] T027 [US1] Convert `backend/src/modules/auth/auth.service.ts` to `@Injectable() AuthService` (`register`, `login`) using `PrismaService`, `LockoutService`, `SessionService`; same check order block → credentials → status; `P2002` → `EMAIL_TAKEN`
- [ ] T028 [US1] Create `backend/src/modules/auth/auth.controller.ts` (`@Controller('auth')`, all `@Public()`): `POST register` `@HttpCode(201)` → set cookie; `POST login` `@HttpCode(200)` → set cookie; `POST refresh` `@HttpCode(200)` → on `AppError` clear cookie and rethrow; `POST logout` `@HttpCode(204)` → end session, clear cookie; use `@Res({ passthrough: true })` and `@Req()` cookies; create `backend/src/modules/auth/auth.module.ts` (exports `SessionService`); import it in `backend/src/app.module.ts`
- [ ] T029 [US1] Run `npm run test:api -- us01 us02 us03 compat compat-tokens` → **gate: US-01, US-02, US-03 green on Nest** (the `/api/users/me` cases in us02 pass after T033)

### Module: users (US-04, US-05, US-06)

- [ ] T030 [P] [US1] Create `backend/src/modules/users/dto/update-profile.dto.ts` (`fullName?`: same rules as register; `bio?`: `@IsOptional()` `@Transform(trim, '' → null)` `@ValidateIf(v => v !== null)` `@IsString()` `@MaxLength(500, { message: 'Bio must be 500 characters or fewer' })`) and `backend/src/modules/users/dto/change-password.dto.ts` (`currentPassword`: `@IsString()` `@IsNotEmpty({ message: 'Current password is required' })` `@MaxLength(200)`; `newPassword`: password rule as T024; `confirmPassword`: `@Match('newPassword', { message: 'Passwords do not match' })`)
- [ ] T031 [P] [US1] Create `backend/src/modules/users/photo.service.ts` (`@Injectable()`, `savePhoto(userId, bytes)` from `backend/src/modules/users/photo-upload.ts` unchanged: JPEG `FF D8 FF` / PNG `89 50 4E 47` magic bytes → else `Errors.unsupportedFileType()`, write `avatars/<userId>-<randomToken>.<ext>`, update `photoPath`, delete previous file)
- [ ] T032 [US1] Convert `backend/src/modules/users/users.service.ts` to `@Injectable() UsersService` (`getMe`, `updateProfile`, `changePassword` ending other sessions in one transaction) with injected `PrismaService`
- [ ] T033 [US1] Create `backend/src/modules/users/users.controller.ts` (`@Controller('users')`, default protected): `GET me`; `PATCH me`; `PUT me/photo` with `FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize: 2 * 1024 * 1024, files: 1 } })`, missing file → `400 VALIDATION_ERROR` with `details: [{ field: 'photo', message: 'Choose a photo to upload' }]`; `POST me/password` `@HttpCode(204)` using `@CurrentUser()`; all responses through `toUserDto` from `backend/src/modules/users/user.dto.ts`; create `backend/src/modules/users/users.module.ts`; import in `backend/src/app.module.ts`
- [ ] T034 [US1] Change only the setup of `backend/tests/integration/us04-access.test.ts`: replace the Express `Router` with a test-only `@Controller('__test')` class exposing `GET student` `@Roles('STUDENT')`, `GET instructor` `@Roles('INSTRUCTOR')`, `GET admin` `@Roles('ADMIN')`, passed via `initApp({ controllers: [TestRolesController] })`; keep every `expect` line
- [ ] T035 [US1] Run `npm run test:api -- us01 us02 us03 us04 us05 us06 compat compat-tokens` → **gate: US-01 … US-06 green on Nest**

### Module: password-reset (US-07)

- [ ] T036 [P] [US1] Create `backend/src/modules/password-reset/dto/reset-request.dto.ts` (`email`: trim + lowercase, `@IsString()` `@IsNotEmpty({ message: 'Email is required' })` `@MaxLength(254)`) and `backend/src/modules/password-reset/dto/reset-confirm.dto.ts` (`token`: `@IsString()` `@IsNotEmpty()` `@MaxLength(200)`; `newPassword`: password rule; `confirmPassword`: `@Match('newPassword', { message: 'Passwords do not match' })`)
- [ ] T037 [US1] Convert `backend/src/modules/password-reset/password-reset.service.ts` to `@Injectable() PasswordResetService` using `PrismaService` and `MailService` (send after response via `setImmediate`, never log the link; `check`; `confirm` in one transaction ending all sessions)
- [ ] T038 [US1] Create `backend/src/modules/password-reset/password-reset.controller.ts` (`@Controller('auth/password-reset')`, `@Public()`): `POST request` `@HttpCode(202)` → `{ message: 'If an account exists for this email, a reset link has been sent.' }`; `GET :token` → `{ valid: true }`; `POST confirm` `@HttpCode(204)`; declare `confirm` and `request` routes before `:token`; create `backend/src/modules/password-reset/password-reset.module.ts`; import in `backend/src/app.module.ts`
- [ ] T039 [US1] Point `backend/package.json` `"dev"` at `nest start --watch`, `"build"` at `nest build`, `"start"` at `node dist/main.js`; run `npm run test:api` → **gate: all 59 EP-01 tests + compat tests green on Nest** (openapi.test.ts may fail until US2)
- [ ] T040 [US1] Verify SC-002: `git diff 001-auth-accounts --stat -- frontend/` shows 0 files; `npm run test:web` passes; `npm run dev` + log in through http://localhost:4200

**Checkpoint**: Nest serves all of EP-01; the Angular app works unchanged.

---

## Phase 4: User Story 2 - API documentation is generated from the code (Priority: P2)

**Goal**: Swagger UI at `/api/docs` and the document at `/api/openapi.json`, from decorators, dev only.

**Independent Test**: 11 endpoints in the document; a throw-away controller appears without editing docs; both URLs 404 in production.

### Tests for User Story 2 ⚠️ (write first, must fail)

- [ ] T041 [US2] Rewrite `backend/tests/integration/openapi.test.ts` for Swagger: `GET /api/openapi.json` → `200` with `openapi` starting `3.`; exactly the 11 operations of the 001 contract (method + path, `{token}` param); tags `Auth`, `Profile`, `Password reset`; `POST /api/auth/register` request schema has `fullName` `minLength: 2` `maxLength: 100` and an example; protected operations list `bearerAuth`, refresh/logout list `refreshCookie`; `GET /api/docs` → `200` HTML; with `initApp({ controllers: [ThrowAwayController] })` the extra route appears (SC-005); with `process.env.NODE_ENV = 'production'` both URLs → `404 NOT_FOUND` (FR-014)

### Implementation for User Story 2

- [ ] T042 [P] [US2] Add `@ApiProperty` / `@ApiPropertyOptional` (description, example, `minLength`/`maxLength`/`format` mirroring the validators) to every DTO in `backend/src/modules/*/dto/`; create response classes `backend/src/modules/auth/dto/auth-response.dto.ts`, `backend/src/modules/users/dto/user-response.dto.ts`, `backend/src/common/dto/error-response.dto.ts`
- [ ] T043 [P] [US2] Decorate controllers: `@ApiTags('Auth' | 'Profile' | 'Password reset')`, `@ApiOperation({ summary })` (reuse the summaries from `backend/src/docs/openapi.ts`), `@ApiBearerAuth('bearerAuth')` on users, `@ApiCookieAuth('refreshCookie')` on refresh/logout, `@ApiConsumes('multipart/form-data')` + `@ApiBody` for photo, `@ApiResponse` for every status in the 001 error table using `ErrorResponseDto`, `Retry-After` header on `429`
- [ ] T044 [US2] In `backend/src/app.setup.ts`, when `process.env.NODE_ENV !== 'production'`: build `DocumentBuilder` (title "LearnPath API", version, `addBearerAuth(…, 'bearerAuth')`, `addCookieAuth('lp_refresh', …, 'refreshCookie')`), `SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/openapi.json' })`; relax helmet `contentSecurityPolicy` for `/api/docs` only
- [ ] T045 [US2] Rewrite `backend/scripts/export-openapi.ts` to create the Nest app (no `listen`), run `configureApp`, build the document with the same function as T044 and write `backend/openapi.json`; delete `backend/src/docs/openapi.ts`; run `npm run openapi` and import the file into Apidog (11 endpoints)

**Checkpoint**: docs generated from code; hand-written document gone.

---

## Phase 5: User Story 3 - One clear structure for the next epics (Priority: P3)

**Goal**: only the Nest implementation remains; structure and access rules are the documented pattern.

**Independent Test**: no Express-era files or Zod/Vitest left; `@Roles` test controller passes; layout matches plan.md.

- [ ] T046 [US3] Delete the Express implementation: `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/middleware/` (authenticate, require-role, validate, error-handler), `backend/src/modules/auth/auth.routes.ts`, `backend/src/modules/auth/auth.schemas.ts`, `backend/src/modules/users/users.routes.ts`, `backend/src/modules/users/users.schemas.ts`, `backend/src/modules/users/photo-upload.ts`, `backend/src/modules/password-reset/password-reset.routes.ts`, `backend/src/modules/password-reset/password-reset.schemas.ts`, `backend/src/lib/mailer.ts`, `backend/src/config/env.ts`, `backend/src/db/prisma.ts`; repoint `backend/prisma/seed.ts` and `backend/tests/helpers/*.ts` to `env` from `backend/src/config/env.validation.ts` and a local `PrismaClient`; remove `passwordRule` (Zod) from `backend/src/lib/password.ts` keeping `PASSWORD_RULE_MESSAGE`, `hashPassword`, `verifyPassword`, `verifyAgainstDummy`
- [ ] T047 [US3] Remove `zod`, `vitest` (and `express` as a direct dependency if nothing imports it) from `backend/package.json`; delete `backend/vitest.config.ts`; remove `"vitest.config.ts"` from `backend/tsconfig.json` `include`; add `"prisma.config.ts"`, `"scripts"`, `"jest.config.ts"` if missing
- [ ] T048 [US3] Verify SC-007 / FR-017: search `backend/src` and `backend/tests` for `express.Router`, `from 'zod'`, `from 'vitest'`, `middleware/` → no matches; `npm run test:api` still all green

**Checkpoint**: one implementation, one pattern.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T049 [P] Update root `package.json` scripts if any backend script name changed (FR-018: `dev`, `test`, `lint`, `build`, `setup`, `db:*`, `openapi` keep their names) and `README.md` (stack line NestJS, `/api/docs` link)
- [ ] T050 [P] Update `backend/eslint.config.mjs` ignores (`dist/`, `src/generated/`) and run `npm run lint` (backend lint + typecheck, frontend lint) → clean
- [ ] T051 Run `npm run build` (backend `nest build`, frontend) and `NODE_ENV=production node backend/dist/main.js` → `/api/docs` and `/api/openapi.json` return `404 NOT_FOUND`
- [ ] T052 Run every check in `specs/002-nestjs-migration/quickstart.md` "Final checks" (including the 001 scripted walkthrough, 31 checks, and `npm run db:status` up to date) and record results in `specs/002-nestjs-migration/checklists/verification.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: none. Gate T007 (72/72 on Jest) blocks everything after it.
- **Foundational (Phase 2)**: after Setup. Gate T021 blocks the modules.
- **US1 (Phase 3)**: after Foundational; modules strictly in order auth (T024–T029) → users (T030–T035) → password reset (T036–T039), each closed by its gate (FR-017a).
- **US2 (Phase 4)**: after US1 (documents the migrated controllers).
- **US3 (Phase 5)**: after US2 (T046 deletes `docs/openapi.ts` dependents and Express only when nothing uses them).
- **Polish (Phase 6)**: after US3.

### Within Each Phase

- Tests first (T017, T022, T023, T041) and confirm they fail.
- DTOs and services before controllers; controller before its module's gate.
- Never edit an `expect(...)` line in `us0*.test.ts`; if a gate fails, fix the Nest code.

### Parallel Opportunities

- Setup: T004 alongside T003.
- Foundational: T009–T016 are separate files and can be written together after T008.
- US1 auth: T024 and T025 together; users: T030 and T031 together; reset: T036 with T037.
- US2: T042 and T043 together.
- Polish: T049 and T050 together.

---

## Parallel Example: Foundational

```bash
# After T008, write the shared pieces together:
Task: "Create backend/src/common/guards/jwt-auth.guard.ts"
Task: "Create backend/src/common/guards/roles.guard.ts"
Task: "Create backend/src/common/pipes/validation.pipe.ts"
Task: "Create backend/src/prisma/prisma.service.ts and prisma.module.ts"
Task: "Create backend/src/mail/mail.service.ts and mail.module.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Phase 1 → gate 72/72 on Jest (Express)
2. Phase 2 → gate harness + compat on Nest
3. Phase 3 → three module gates → all EP-01 tests on Nest, web app unchanged
4. **STOP and VALIDATE**: this alone satisfies the "nothing changes" promise; docs (US2) and cleanup (US3) follow

### Incremental Delivery

1. After each gate, commit (`refactor(api): …`) so any regression is one commit away
2. US2 replaces the hand-written docs; re-import into Apidog
3. US3 deletes the old stack; merge `002-nestjs-migration` before EP-02 (constitution 2.0.0 transition rule)

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- The 001 tests are the specification; changing an assertion to make a gate pass is not allowed
- Keep `lib/clock.ts`, `lib/tokens.ts`, `lib/password.ts` hashing and `toUserDto` unchanged; they carry the behaviour
- Commit after each gate at minimum
