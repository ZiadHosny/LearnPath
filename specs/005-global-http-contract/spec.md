# Feature Specification: Global error handling and response format

**Feature Branch**: `005-global-http-contract`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "I want global error handling and response, and all these global things done well so that if I want to change something I can" (TS-04 in course-school-user-stories.md)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Change the response format in one place (Priority: P1)

A developer who wants to change how responses look (an error message, a status, or wrapping
successes in an envelope) edits one file and every endpoint follows.

**Independent Test**: change one catalog entry or the envelope setting in a test and observe
every affected endpoint change.

**Acceptance Scenarios**:

1. **Given** the error catalog, **When** a code's default message or status is read by any
   endpoint, **Then** it comes from the catalog entry (no other copy exists).
2. **Given** the default settings, **When** any endpoint answers, **Then** the success body and
   the error body are exactly as today (`<data>` and `{ "error": { code, message, details? } }`).
3. **Given** the envelope setting turned on, **When** an endpoint succeeds, **Then** the body is
   `{ "data": <data> }`; a 204 stays empty; errors keep the error shape.

### User Story 2 - Trace any response to its logs (Priority: P2)

A developer receiving an error report with a request id finds every log line of that request.

**Independent Test**: call an endpoint with and without an `X-Request-Id`; check the header and
the captured log lines.

**Acceptance Scenarios**:

1. **Given** a request without an id, **When** it is answered, **Then** the response has an
   `X-Request-Id` header with a new id.
2. **Given** a request with a valid `X-Request-Id`, **When** it is answered, **Then** the same id
   is returned; an invalid one (too long or with unsafe characters) is replaced.
3. **Given** any request, **When** it is logged, **Then** the request line carries its id; an
   unexpected error's log line carries the same id and the stack.
4. **Given** an unexpected error, **When** it is answered, **Then** the body is the generic 500
   (`INTERNAL`, "Something went wrong") with no stack or internal detail.

## Requirements *(mandatory)*

- **FR-001**: Each error code MUST be defined once with status and default message; all error
  creation MUST use the catalog.
- **FR-002**: One response-format module MUST build every error body and every success body.
- **FR-003**: Default output MUST equal the current contract (001 `auth-api.md`, 002
  `api-compatibility.md`); existing tests MUST pass unchanged; the web app MUST NOT change.
- **FR-004**: A single setting MUST switch success bodies to `{ "data": … }`; 204 responses stay
  empty.
- **FR-005**: Every response MUST carry `X-Request-Id`; caller ids matching `^[A-Za-z0-9._-]{1,64}$`
  are kept, others replaced.
- **FR-006**: Request and unexpected-error log lines MUST include the request id.
- **FR-007**: The API documentation MUST still describe the error shape from the same module.

## Success Criteria *(mandatory)*

- **SC-001**: 0 places outside the catalog define an error status or default message.
- **SC-002**: All existing backend tests pass; 0 web app files change.
- **SC-003**: 100% of responses in the tests carry `X-Request-Id`.
- **SC-004**: Turning the envelope on changes success bodies of all endpoints with one edit.

## Assumptions

- The envelope stays off by default; turning it on is a breaking change for the web app, which
  would need its own story.
- Request ids are random UUIDs.
