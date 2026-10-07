# Feature Specification: Align the API with the NestJS 12 defaults

**Feature Branch**: `003-nest12-alignment`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "TS-02 Align the API with the NestJS 12 defaults, from course-school-user-stories.md"

## Context

TS-02 is a technical story found after [002-nestjs-migration](../002-nestjs-migration/spec.md).
002 chose CommonJS and Jest because those were the NestJS defaults up to version 11. A fresh
`nest new` with NestJS 12 (checked 2026-10-04) generates an **ES module** project tested with
**Vitest**. The 002 setup works, but it needs Jest's experimental `--experimental-vm-modules`
flag to load the ESM NestJS packages, and it does not match the NestJS 12 docs and generators.
This story removes that difference before EP-02 adds more code. It supersedes 002's FR-017b
("Backend tests MUST run on Jest").

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nothing changes for people using LearnPath (Priority: P1)

The API behaves exactly as after 002: same endpoints, errors, cookies, logins and docs. The web
app is not modified.

**Independent Test**: every existing backend test passes on the new setup without changing what
it checks; the 001 scripted walkthrough passes; 0 web app files change.

**Acceptance Scenarios**:

1. **Given** the existing backend tests, **When** they run on the new setup, **Then** all pass
   with no change to their assertions.
2. **Given** the web app, **When** it is used against the API, **Then** it works with 0 changed
   files.
3. **Given** the API in production mode, **When** it starts, **Then** it serves requests and the
   docs stay hidden, as before.

### User Story 2 - The project is set up like a new NestJS 12 project (Priority: P2)

A developer following the NestJS 12 docs finds the same module system, test runner and script
names as a fresh `nest new` project, and no experimental runtime flags.

**Independent Test**: inspect `backend/package.json` and run the standard scripts.

**Acceptance Scenarios**:

1. **Given** the backend, **When** a developer reads `package.json`, **Then** it declares an ES
   module project and runs tests with Vitest.
2. **Given** any project script, **When** it runs, **Then** no `--experimental-vm-modules` (or
   other experimental Node flag) is used.
3. **Given** the standard NestJS 12 script names (`start:dev`, `start:debug`, `start:prod`,
   `test:watch`, `test:cov`, `test:e2e`, `format`), **When** a developer runs them, **Then** they
   work; the existing short names (`dev`, `start`, `test`, `openapi`, `db:*`) keep working.
4. **Given** the API starting, **When** it logs its address, **Then** the log goes through Nest's
   logger.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Client-visible behaviour MUST NOT change (contract: 001 `auth-api.md` and 002
  `api-compatibility.md`); the web app MUST NOT change.
- **FR-002**: The backend MUST be an ES module project (`"type": "module"`), including the
  generated database client.
- **FR-003**: Backend tests MUST run on Vitest; the existing tests MUST keep what they check;
  Jest and its packages MUST be removed. This supersedes 002 FR-017b.
- **FR-004**: No project script MAY use an experimental Node flag.
- **FR-005**: The standard NestJS 12 scripts MUST exist alongside the existing short names
  (root and backend), which keep working (002 FR-018).
- **FR-006**: `rxjs` MUST be a direct dependency; the start-up message MUST use Nest's `Logger`.
- **FR-007**: The structure check MUST also assert FR-002 – FR-004 (ESM, Vitest, no Jest, no
  experimental flag).

## Success Criteria *(mandatory)*

- **SC-001**: 100% of backend tests pass on Vitest with no change to their assertions.
- **SC-002**: 0 web app files change; web app tests pass.
- **SC-003**: The 001 scripted walkthrough passes all 31 checks.
- **SC-004**: 0 occurrences of `--experimental-vm-modules` and 0 Jest packages in the project.
- **SC-005**: Build, lint, typecheck, seed and OpenAPI export all succeed.

## Assumptions

- Vitest 4 (the version the NestJS 12 template and the Angular app use) emits decorator metadata
  through Vite 8's transformer, so NestJS dependency injection works in tests without a plugin
  (verified 2026-10-07 with a probe test).
- ESLint stays (the template's oxlint is optional; ESLint is shared with the Angular app).
- Tests stay in `backend/tests/` with their current names; renaming them to `*.e2e-spec.ts` adds
  no value. `test:e2e` runs the same suite.
- Unit tests for services are added with new stories from EP-02 on, not retrofitted here.
