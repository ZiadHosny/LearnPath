# LearnPath Constitution

## Core Principles

### I. Vertical Slice Delivery

Every user story MUST be built end to end before the next story starts: the API
endpoint(s), the Angular screen(s), and the automated tests that cover it. A story is done
only when all three exist, the tests pass, and the feature works through the real UI.
Building a horizontal layer (for example, all endpoints first) ahead of the stories that
use it is not allowed. Technical stories (TS-xx) have no screen; they are done when their
acceptance criteria are tested and existing tests still pass.

**Rationale**: each finished story is demonstrable and verifiable on its own, and
integration problems surface per story instead of at the end.

### II. Every Acceptance Criterion Is Tested (NON-NEGOTIABLE)

Every acceptance criterion of a story MUST map to at least one automated test that fails
if the criterion is not met. API behaviour (status codes, validation, messages) MUST be
covered by API tests; screen behaviour (redirects, guards, visible messages) MUST be
covered by Angular tests. A story with an untested acceptance criterion is not done.

**Rationale**: the acceptance criteria are the contract of the story; tests are how the
contract is proven and kept from regressing.

### III. Secure Authentication

- Passwords MUST be hashed with bcrypt and MUST never be stored, logged, or returned in
  plain text.
- Authentication MUST use JWT access tokens. The Angular app MUST attach the token to
  API calls through an HTTP interceptor and MUST clear it on logout.
- All input MUST be validated on the server, regardless of any client-side validation.

**Rationale**: account data is the first thing every other feature depends on; a
weakness here compromises the whole platform.

### IV. Role-Based Access on Both Sides

Roles (Guest, Student, Instructor, Admin) MUST be enforced in two places:

- **API**: an authentication guard MUST reject a missing or invalid token with `401`, and
  a roles guard MUST reject a valid token with the wrong role with `403`, on every
  protected endpoint. Allowed roles are declared on the endpoint itself (e.g. `@Roles(...)`).
- **Angular**: route guards MUST block pages the current role cannot use, and navigation
  MUST only show items that role can reach.

The API check is the security boundary; the Angular check is for usability and MUST NOT
be relied on alone.

**Rationale**: a hidden page is not a protected page; only the server can enforce
access.

### V. Phase-Scoped Simplicity

Work MUST stay within the current phase defined in `course-school-user-stories.md`.
Phase 1 excludes payments, quizzes, certificates, and reviews. Abstractions, layers, or
dependencies MUST NOT be added for anticipated future needs; any added complexity MUST be
justified in the feature plan.

**Rationale**: a small, working platform beats a large, unfinished one.

## Technology Constraints

- **Frontend**: Angular.
- **Backend**: Node.js + NestJS, exposing a REST API with JSON request and response
  bodies, organised as one NestJS module per feature.
- **Database**: PostgreSQL.
- **Authentication**: JWT.

**Transition**: EP-01 was built on Express under version 1.0.0. TS-01 moves it to NestJS
and MUST be completed before EP-02 starts. No new feature may be built on Express.

Changing any item in this list is a constitution amendment (see Governance).

## Development Workflow

- Each feature follows the Spec Kit flow: specify → clarify → plan → tasks → implement,
  on its own feature branch.
- Stories are built in the build order listed in `course-school-user-stories.md`, one
  story at a time, following Principle I.
- Before merging a feature branch: all tests pass, every acceptance criterion in scope
  is covered (Principle II), and the plan's Constitution Check shows no unjustified
  violations.

## Governance

This constitution overrides other project practices. Every plan MUST include a
Constitution Check against these principles, and every review MUST verify compliance.

Amendments are made by updating this file through `/speckit-constitution`, with the
version bumped by semantic versioning:

- **MAJOR**: a principle is removed or redefined in a backward-incompatible way, or a
  Technology Constraint is changed.
- **MINOR**: a principle or section is added, or guidance is materially expanded.
- **PATCH**: clarifications and wording fixes with no change in meaning.

**Version**: 2.0.0 | **Ratified**: 2026-09-30 | **Last Amended**: 2026-10-03
