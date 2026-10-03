# Feature Specification: Move the API to NestJS

**Feature Branch**: `002-nestjs-migration`

**Created**: 2026-10-03

**Status**: Draft

**Input**: User description: "TS-01 Move the API from Express to NestJS, from course-school-user-stories.md"

## Context

TS-01 is a technical story. Constitution 2.0.0 changed the backend framework from Express to
NestJS and requires TS-01 to finish before EP-02 starts. The API built in
[001-auth-accounts](../001-auth-accounts/spec.md) must keep behaving exactly as it does today;
only how it is built changes. "Users" in this spec are therefore the people and programs that
call the API (the LearnPath web app, testers using Apidog) and the developers who extend it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Nothing changes for people using LearnPath (Priority: P1)

Students, instructors and admins keep registering, logging in, staying logged in, logging out,
editing their profile, changing and resetting passwords exactly as before. The web app is not
modified at all.

**Why this priority**: the migration has no value if it breaks the accounts that every other
feature depends on.

**Independent Test**: run the existing EP-01 API test suite and the 001 quickstart walkthrough
against the new API without changing what they check; all pass.

**Acceptance Scenarios**:

1. **Given** the existing EP-01 API tests, **When** they run against the new API, **Then** all
   pass with no change to their assertions (only the test setup that starts the API may change).
2. **Given** the web app as it is today, **When** it is used against the new API, **Then** every
   EP-01 screen works with no change to the web app's code.
3. **Given** a user who logged in before the switch, **When** the new API starts, **Then** their
   login keeps renewing until it would have expired anyway; they are not forced to log in again.
4. **Given** any invalid request (bad input, wrong role, expired link, oversized photo),
   **When** it is sent to the new API, **Then** the status code, error code and message are the
   same as before.

---

### User Story 2 - API documentation is generated from the code (Priority: P2)

A developer or tester opens the API documentation page, or imports the API description into
Apidog, and sees every endpoint with its inputs, responses and errors, without anyone keeping
a separate list up to date.

**Why this priority**: today the endpoint list is maintained by hand and a new endpoint can be
forgotten; this was the main reason to switch.

**Independent Test**: open the documentation page and the API description URL; all 11 EP-01
endpoints are present. Add a throw-away endpoint in a test build; it appears without editing
any documentation file.

**Acceptance Scenarios**:

1. **Given** the API running in development, **When** a developer opens the documentation page,
   **Then** all 11 endpoints are listed, grouped as Auth, Profile and Password reset, and can be
   tried from the page.
2. **Given** the API running in development, **When** Apidog imports the API description from
   the same address as today, **Then** all 11 endpoints are imported with request examples.
3. **Given** a new endpoint added to the code, **When** the API restarts, **Then** it appears in
   the documentation and the API description with no separate edit.
4. **Given** the API running in production mode, **When** anyone requests the documentation page
   or the API description, **Then** they are not available.

---

### User Story 3 - One clear structure for the next epics (Priority: P3)

A developer starting EP-02 adds a new feature area by following the same layout as auth,
users and password reset, and protects each endpoint by declaring which roles may call it.

**Why this priority**: it is what makes the next 22 stories faster and safer to build, but it
delivers no visible behaviour on its own.

**Independent Test**: inspect the project layout and the access rules; protect a test-only
endpoint per role by declaration alone and confirm the 401/403 behaviour.

**Acceptance Scenarios**:

1. **Given** the project, **When** a developer looks for the code of a feature area, **Then**
   auth, users and password reset each live in their own module, and shared pieces (access
   checks, error format, database access, email) live in shared modules.
2. **Given** an endpoint declared for one role, **When** it is called without a login, **Then**
   the answer is "not authenticated" (401); **When** it is called by another role, **Then** the
   answer is "not permitted" (403).
3. **Given** the old implementation, **When** the migration is complete, **Then** no part of it
   remains in the project; there is one way to build an endpoint.

---

### Edge Cases

- Unknown routes still return the uniform "not found" error body, not a framework default page.
- A malformed JSON body still returns the uniform validation error, not a framework default.
- Unknown fields in a request body (for example `email` on profile update) are still refused.
- A photo over 2 MB is still refused with the same error and the old photo is kept.
- Login and forgot-password still take the same time for existing and unknown emails.
- Errors not expected by the code still return the uniform "Something went wrong" body and
  never leak stack traces or request bodies.
- Uploaded profile photos stay at the same addresses, so existing `photoUrl` values keep working.

## Requirements *(mandatory)*

### Functional Requirements

**Behaviour preserved (contract: [001 auth-api.md](../001-auth-accounts/contracts/auth-api.md))**

- **FR-001**: The API MUST expose the same 11 endpoints, with the same addresses and methods.
- **FR-002**: The API MUST apply the same input rules and return the same field-level error
  details for invalid input.
- **FR-003**: The API MUST return the same status codes, error codes, messages and error body
  shape for every case listed in the 001 contract, including unknown routes and malformed bodies.
- **FR-004**: The API MUST keep the refresh cookie's name, flags, path and lifetime unchanged.
- **FR-005**: Logins and sessions created before the switch MUST stay valid: access tokens
  signed before the switch are accepted until they expire, and refresh sessions keep renewing.
- **FR-006**: All time-based rules (15-minute login, 7-day renewal, 5-in-15-minutes block,
  1-hour reset link) and session rules (logout, password change, reset, blocked accounts) MUST
  behave exactly as in 001.
- **FR-007**: Uploaded photos MUST remain available at their current addresses.
- **FR-008**: The data store structure MUST NOT change; no new migrations are created and the
  seed accounts still load.

**Access control**

- **FR-009**: Every protected endpoint MUST answer "not authenticated" (401) for a missing,
  invalid or expired login, through one shared check.
- **FR-010**: Endpoints MUST declare the roles allowed to call them; a caller with another role
  MUST get "not permitted" (403).

**API documentation**

- **FR-011**: In development, the API MUST serve a documentation page where every endpoint can
  be read and tried, and the machine-readable API description at the same address as today.
- **FR-012**: The documentation and API description MUST be produced from the code itself, so
  any endpoint in the code appears without a separate edit.
- **FR-013**: Each documented endpoint MUST show its request body rules, example values,
  success response and possible errors.
- **FR-014**: The documentation page and API description MUST NOT be available in production.
- **FR-015**: The existing command that writes the API description to a file MUST keep working.

**Structure and workflow**

- **FR-016**: Each feature area (auth, users, password reset) MUST live in its own module;
  shared concerns (access checks, error format, database access, email) MUST live in shared
  modules.
- **FR-017**: The previous implementation MUST be removed completely when the migration is done.
- **FR-018**: The existing project commands (start everything, run tests, lint, build, set up,
  seed, export API description) MUST keep working with the same names.

### Key Entities

No new data. Users, sessions, login attempts and password reset requests stay exactly as
defined in [001 data-model.md](../001-auth-accounts/data-model.md).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the existing EP-01 API tests pass against the new API with no change to
  their assertions.
- **SC-002**: The web app needs 0 changed files to work with the new API, and all its tests
  still pass.
- **SC-003**: The 001 quickstart walkthrough passes all its checks against the new API.
- **SC-004**: 11 of 11 endpoints appear in the documentation page and in an Apidog import.
- **SC-005**: A newly added endpoint appears in the documentation with 0 documentation files
  edited.
- **SC-006**: A user logged in before the switch is still logged in afterwards (no forced
  re-login).
- **SC-007**: 0 files of the previous implementation remain once the migration is complete.

## Assumptions

- The framework is NestJS, as required by constitution 2.0.0; this spec does not compare
  frameworks.
- The API stays in the `backend/` folder and keeps the same port and environment settings, so
  the web app's development proxy and `.env` files do not change.
- The database layer and its schema, migrations and seed stay as they are.
- The secret used to sign logins stays the same, which is what keeps existing logins valid
  (FR-005).
- The existing test suite is the safety net: tests may change how they start the API, but not
  what they check. New tests are added only for new behaviour (documentation, declared roles).
- The work is done on top of the 001 implementation and is merged before EP-02 starts.
- No new end-user features are added (constitution V).
