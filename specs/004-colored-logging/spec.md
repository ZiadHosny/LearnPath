# Feature Specification: Colored, customizable logging

**Feature Branch**: `004-colored-logging`

**Created**: 2026-10-07

**Status**: Draft

**Input**: User description: "add new story for colored logging and make global loggers that can be customized, like for errors and success and story, and implement it" (TS-03 in course-school-user-stories.md)

## Clarifications

### Session 2026-10-07

- Q: What does "story" mean in "errors and success and story"? → A: Interpreted as tagging log
  lines with the user story they belong to (e.g. `[US-02]`), alongside per-level styling for
  errors, success and the other levels. (Assumption stated to the user; change if wrong.)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Readable, colored logs by level (Priority: P1)

A developer running the API sees each log line with time, a colored level label, where it came
from, the story tag when there is one, and the message. Errors stand out in red, successes in
green.

**Independent Test**: log one line per level through the logger with colors on; each line has
its level's color and label; with colors off there are no color codes.

**Acceptance Scenarios**:

1. **Given** colors on, **When** a line is logged at each level, **Then** error is red, warn
   yellow, success green, log cyan, debug magenta, verbose gray, each with its label.
2. **Given** a log carrying a story, **When** it is printed, **Then** it shows the tag (e.g.
   `[US-02]`).
3. **Given** an error with a stack, **When** it is printed, **Then** the stack follows the line.
4. **Given** NestJS's own start-up messages, **When** the API starts, **Then** they go through
   the same logger and format.

### User Story 2 - Customizable without code changes (Priority: P1)

A developer or operator chooses how much to log, whether to use colors and whether to emit
pretty text or JSON, through settings; a developer changes a level's color or label in one place.

**Independent Test**: change each setting and observe the output.

**Acceptance Scenarios**:

1. **Given** a minimum level (e.g. warn), **When** lower levels are logged, **Then** they are
   not printed.
2. **Given** colors set to off, or `NO_COLOR` set, or output not a terminal with colors on
   auto, **When** lines are printed, **Then** they contain no color codes.
3. **Given** JSON format, **When** a line is logged, **Then** it is one JSON object with time,
   level, context, story (if any), message and extra fields.
4. **Given** a custom style for a level (color and label), **When** that level is logged,
   **Then** the custom style is used.

### User Story 3 - Requests and account events are logged safely (Priority: P2)

Every API request and every account event leaves one log line, so a developer can follow what
happened, without any secret ending up in the logs.

**Independent Test**: call endpoints and inspect captured log lines.

**Acceptance Scenarios**:

1. **Given** any API request, **When** it finishes, **Then** one line shows method, path,
   status and duration; 2xx/3xx at log level, 4xx at warn, 5xx at error.
2. **Given** a reset-link check (`GET /api/auth/password-reset/<token>`), **When** it is logged,
   **Then** the token is masked.
3. **Given** sign-up, login, failed login, logout, password change, reset requested and reset
   done, **When** they happen, **Then** each logs one line tagged with its story (US-01, US-02,
   US-02, US-03, US-06, US-07, US-07), success level for successes and warn for the failed login.
4. **Given** any request or account log line, **When** it is inspected, **Then** it contains no
   password, token, cookie, authorization header, request body or email address.

## Requirements *(mandatory)*

- **FR-001**: One application logger MUST serve NestJS and the application code.
- **FR-002**: Levels MUST be error, warn, success, log, debug, verbose (and fatal, shown as
  error), each with a default color and label as in US1-AS1.
- **FR-003**: A log line MAY carry a story id and extra fields; the story MUST be shown as a tag.
- **FR-004**: Settings `LOG_LEVEL` (default `log`), `LOG_COLORS` (`auto` default, `true`,
  `false`; `NO_COLOR` forces off) and `LOG_FORMAT` (`pretty` default; `json`) MUST be validated
  at start-up with the other settings.
- **FR-005**: Level styles (color, label) MUST be defined in one config file and be overridable.
- **FR-006**: Each finished API request MUST be logged once with method, path, status, duration;
  long token-like path segments MUST be masked.
- **FR-007**: The account events in US3-AS3 MUST be logged with user id only.
- **FR-008**: No log line MAY contain passwords, tokens, cookies, authorization headers, request
  bodies or email addresses.
- **FR-009**: API behaviour and responses MUST NOT change; the existing tests keep passing.

## Success Criteria *(mandatory)*

- **SC-001**: Every level prints with its own color and label; 0 color codes when colors are off.
- **SC-002**: 100% of API requests in the tests produce exactly one request line.
- **SC-003**: 0 secrets (password, token, email, cookie, authorization) in captured log lines
  during the account flows.
- **SC-004**: All existing backend tests still pass.

## Assumptions

- Tests run with `LOG_LEVEL=error` to keep output quiet; logging tests switch level and output
  at run time.
- Colors use Node's built-in `util.styleText` (no new dependency).
- Production defaults stay `pretty`; JSON is chosen by setting `LOG_FORMAT=json` where logs are
  collected by a tool.
