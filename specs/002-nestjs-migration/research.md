# Research: Move the API to NestJS

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-10-04

Fixed by the spec/clarifications: NestJS, class-validator DTOs, Jest (switched first), in-place
module-by-module migration in `backend/`, Prisma and the database unchanged. Versions checked
on npm today: `@nestjs/*` 12.x, `@nestjs/swagger` 12.0, `class-validator` 0.15,
`class-transformer` 0.5, `jest` 30.5, `@swc/jest` 0.2, `@swc/core` 1.16.

The behaviour baseline is the 001 implementation and its 72 API tests; every decision below is
judged first by "does it keep those tests passing unchanged".

## R1. HTTP platform

- **Decision**: NestJS 12 on `@nestjs/platform-express` (`NestExpressApplication`).
- **Rationale**: Express stays underneath, so cookie-parser, helmet, Multer and static file
  serving behave exactly as in 001 (same cookie flags, same upload limits, same `/uploads`
  serving). This removes a whole class of behaviour differences.
- **Alternatives**: `platform-fastify` (faster, but different cookie/multipart/static plugins
  would each need re-verifying against FR-004/FR-007; no benefit for Phase 1 scale).

## R2. Module format (CommonJS instead of ESM)

- **Decision**: switch `backend/` from ESM to **CommonJS**: remove `"type": "module"`, keep
  `"module": "nodenext"` / `"moduleResolution": "nodenext"` in `tsconfig.json` (a package
  without `"type": "module"` compiles to CommonJS under nodenext), keep the existing `.js`
  suffixes in relative imports, and set the Prisma generator's `moduleFormat = "cjs"`.
- **Rationale**: the Nest CLI, `@nestjs/testing` examples and Jest all assume CommonJS; Jest's
  ESM mode is still experimental. TypeScript 6 deprecates `moduleResolution: node10`, so
  `nodenext` + CJS package is the supported way to get CommonJS output. Keeping the `.js`
  suffixes avoids touching every import line.
- **Risk / verify first**: confirm in the first setup task that Nest 12, the generated Prisma
  client and `bcrypt` load under this setup before migrating any module.
- **Alternatives**: stay ESM (Nest can run ESM, but Jest needs
  `--experimental-vm-modules` and decorator metadata ordering issues are common).

## R3. Test runner (Jest, switched first)

- **Decision**: Jest 30 with `@swc/jest` transform (decorators + metadata enabled),
  `testEnvironment: node`, `--runInBand` (same as Vitest `fileParallelism: false`),
  `globalSetup` = existing `prisma migrate deploy`, `setupFilesAfterEnv` = existing
  truncate/clock reset, and `moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' }` for the `.js`
  import suffixes. Test env vars (`DATABASE_URL`, `BCRYPT_COST=4`, `UPLOADS_DIR`, `APP_URL`)
  move from `vitest.config.ts` to `jest.config.ts` via a small `setupFiles` env file.
- **Order**: switch runner while the API is still Express; all 72 tests must pass on Jest
  before any Nest code is written (FR-017b).
- **Syntax changes only**: drop `import … from 'vitest'` (Jest globals), `vi.*` → `jest.*`
  if any. `it.each` tables and `expect` matchers used in 001 exist in Jest unchanged.
- **Alternatives**: `ts-jest` (slower; its 29.x peer range lags Jest 30); keeping Vitest
  (rejected in clarification).

- **Found during implementation**: NestJS 12 packages ship as ESM (`"type": "module"`). Node
  24 can `require()` them, but Jest only does so with `--experimental-vm-modules`, so the test
  script is `node --experimental-vm-modules node_modules/jest/bin/jest.js --runInBand`. The app
  itself stays CommonJS; Node's native `require(esm)` loads Nest at run time. `jest.config.js`
  is plain JS (a `.ts` config would need `ts-node`).

## R4. Input validation with class-validator

- **Decision**: one DTO class per request body; a global `ValidationPipe` with
  `whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`, and an
  `exceptionFactory` that throws the existing `AppError(400, 'VALIDATION_ERROR',
  'Some fields are invalid', details)`, where `details` = one `{ field, message }` per failed
  constraint, in property order.
- **Rule mapping** (every message reuses the 001 text):

  | 001 rule | DTO decorators |
  |---|---|
  | `fullName` trimmed 2–100 | `@Transform(trim)` `@IsString()` `@Length(2, 100, { message: 'Full name must be 2–100 characters' })` |
  | `email` trimmed, lower-case, valid, ≤ 254 | `@Transform(trim + toLowerCase)` `@MaxLength(254)` `@IsEmail({}, { message: 'Enter a valid email' })` |
  | password rule | `@MinLength(8, …)` `@Matches(/[A-Za-z]/, …)` `@Matches(/[0-9]/, …)`, all with `PASSWORD_RULE_MESSAGE` |
  | confirm must equal password | custom `@Match('password', { message: 'Passwords do not match' })` |
  | `bio` ≤ 500, `''` → `null`, `null` allowed | `@IsOptional()` `@Transform(trim, '' → null)` `@ValidateIf(v => v !== null)` `@MaxLength(500)` |
  | unknown fields refused | `forbidNonWhitelisted: true` (field = the unknown property name) |
  | login email/password non-empty | `@IsString()` `@IsNotEmpty()` (no email-format check, as in 001) |

- **Rationale**: matches the 001 error body exactly (FR-002/FR-002a); the Nest default
  `BadRequestException` body would break every validation test.
- **Watch**: `forbidNonWhitelisted` runs before field rules; 001 tests only check `400` +
  `VALIDATION_ERROR` for unknown fields, so order is safe. Env validation also moves to
  class-validator so `zod` is removed entirely.

## R5. Errors (one exception filter)

- **Decision**: keep `AppError` and the `Errors` factory as they are (moved to
  `src/common/errors.ts`); services keep throwing them. A global `AllExceptionsFilter` writes
  `{ error: { code, message, details? } }` for `AppError`, and maps Nest/Express exceptions:
  route not found → `404 NOT_FOUND "Not found"`; body-parser errors keep their own status as
  in 001 (JSON parse error → `400`, JSON body over 100 kb → `413`) with
  `VALIDATION_ERROR "Request body is not valid JSON"`; Multer file size →
  `413 FILE_TOO_LARGE`; anything else → `500 INTERNAL "Something went wrong"` and a log line
  without request body (FR-003, edge cases). `TooManyAttemptsError` sets `Retry-After`.
- **Rationale**: services become portable unchanged, and the error contract has one owner.
- **Alternatives**: making `AppError extend HttpException` (works, but mixes HTTP into the
  domain errors for no gain).

## R6. Authentication and roles

- **Decision**: custom `JwtAuthGuard` registered **globally** (`APP_GUARD`) that reuses
  `lib/tokens.ts` (`verifyAccessToken` with the test clock) and sets `request.auth`; endpoints
  open to guests are marked `@Public()`. `@Roles(...roles)` + global `RolesGuard` (via
  `Reflector`) → `403 FORBIDDEN`. `@CurrentUser()` param decorator returns `request.auth`.
- **Rationale**: secure by default (a forgotten decorator means "protected", never "open"),
  which is the safer failure for constitution IV. Reusing `tokens.ts` keeps token format,
  claims and expiry identical (FR-005) and keeps the controllable clock for tests.
- **Alternatives**: `@nestjs/passport` + `passport-jwt` (common, but cannot use our test clock
  and adds two dependencies for one header check); `@nestjs/jwt` (same signing we already
  have; not needed).

## R7. Prisma in Nest

- **Decision**: global `PrismaModule` exporting `PrismaService extends PrismaClient`
  (constructed with the `PrismaPg` adapter and the global `omit: { user: { passwordHash: true
  } }`), connecting in `onModuleInit`, disconnecting in `onModuleDestroy`. Test helpers keep
  their own client for setup/inspection (allowed: test setup only).
- **Alternatives**: `nestjs-prisma` package (thin wrapper, not needed).

## R8. Configuration

- **Decision**: `@nestjs/config` `ConfigModule.forRoot({ isGlobal: true, validate })` with a
  class-validator `EnvironmentVariables` class carrying the same keys and defaults as 001
  `env.ts`. Plain code that runs outside DI (`seed.ts`, `tokens.ts`, `password.ts`) reads a
  validated `env` object exported from the same file, so there is one definition.
- **Alternatives**: keep Zod for env only (rejected: one validation library).

## R9. API documentation

- **Decision**: `@nestjs/swagger` with **explicit decorators** (`@ApiProperty` on DTO fields,
  `@ApiTags`, `@ApiOperation`, `@ApiBearerAuth`, `@ApiCookieAuth`, `@ApiResponse` with a
  shared `ErrorResponseDto`). `SwaggerModule.setup('api/docs', app, document,
  { jsonDocumentUrl: 'api/openapi.json' })` only when `NODE_ENV !== 'production'`.
  `npm run openapi` builds the app without listening and writes `backend/openapi.json`.
  `helmet` CSP is relaxed only for `/api/docs` so Swagger UI's scripts load.
- **Rationale**: the Swagger CLI plugin needs the `tsc` builder; with SWC (build) and
  `@swc/jest` (tests) its metadata is not produced, so docs would differ between test and run.
  Explicit decorators are deterministic everywhere, and the doc test (SC-004/SC-005) can rely
  on them.
- **Alternatives**: CLI plugin with `tsc` builder (less boilerplate, slower builds, docs not
  testable under Jest); keeping the hand-written `docs/openapi.ts` (violates FR-012).

## R10. Uploads, cookies, static files

- **Decision**: `FileInterceptor('photo', { storage: memoryStorage(), limits: { fileSize:
  2 MB, files: 1 } })`; magic-byte check and file writing stay in the users service as in 001.
  `app.useStaticAssets(uploadsDir, { prefix: '/uploads' })`. Cookies via
  `@Res({ passthrough: true }) res` and the existing `setRefreshCookie` / `clearRefreshCookie`.
  `app.setGlobalPrefix('api')`; static `/uploads` stays outside the prefix.

## R11. Build and scripts

- **Decision**: `nest-cli.json` with `"builder": "swc"` and `typeCheck: true`. Scripts keep
  their names (FR-018): `dev` = `nest start --watch`, `build` = `nest build`, `start` =
  `node dist/main.js`, `test` = `jest --runInBand`, `lint`, `typecheck`, `db:*`, `openapi`.
  `tsx` stays only for `prisma db seed`. Removed dependencies at the end: `zod`, `vitest`, and
  the direct `express`, `multer`, `cookie-parser` imports move behind Nest (packages kept where
  Nest needs them).

## R12b. `reflect-metadata` and test app lifecycle

- **Decision**: `import 'reflect-metadata';` is the first line of every entry point that loads
  Nest or class-validator decorators: `src/main.ts`, `scripts/export-openapi.ts`,
  `prisma/seed.ts` (it loads the env class) and `tests/helpers/jest-env.ts`.
- **Decision**: the test helper owns one Nest app at a time. `initApp(options)` closes the
  current app before building a new one, so a test file can swap in extra controllers
  (`@Roles` test controller, throw-away docs controller) in its own `beforeAll`.
- **Decision**: structure rules (one module per feature, no Express/Zod/Vitest left) are
  checked by an automated `structure.test.ts`, because constitution II requires every
  acceptance criterion, including US3's, to have an automated test.
- **Decision**: the OpenAPI document is validated with `@apidevtools/swagger-parser` in the docs
  test; a valid document is the part of "Apidog can import it" that can be automated.

## R12. Order of work (FR-017a/b)

1. CommonJS switch (R2) and Jest switch on the Express API → 72/72 green. CJS goes first
   because `@swc/jest` emits CommonJS and the ESM-generated Prisma client may rely on
   `import.meta`, which CommonJS cannot run.
2. Nest skeleton beside Express in `backend/src` (`main.ts`, `AppModule`, common,
   Prisma/Config/Mail modules, filter, pipe, guards); tests point at the Nest app; harness and
   404 tests green.
3. Auth module → US-01..US-03 tests green (plus US-04 401 cases).
4. Users module → US-04..US-06 tests green.
5. Password-reset module → US-07 tests green.
6. Swagger + doc tests; delete Express files, `zod`, `vitest`; quickstart walkthrough.

While a module is not yet migrated, its tests are expected to fail against the Nest app; the
gate for each step is that module's tests plus all earlier modules' tests.
