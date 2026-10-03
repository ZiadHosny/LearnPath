# REST API Contract: Authentication & Accounts

**Base path**: `/api` · **Format**: JSON (`application/json`) except photo upload
(`multipart/form-data`) · **Auth**: `Authorization: Bearer <accessToken>` unless marked
*public* · **Refresh cookie**: `lp_refresh` (see [research.md](../research.md) R5)

## Common shapes

**AuthResponse**

```json
{ "accessToken": "jwt", "expiresIn": 900, "user": UserDto }
```

`UserDto`: see [data-model.md](../data-model.md#derived--api-shapes).

**Error** (every non-2xx response)

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "Human-readable text",
             "details": [ { "field": "email", "message": "Invalid email" } ] } }
```

`details` is present only for `VALIDATION_ERROR`.

## Error codes

| HTTP | code | When | Spec |
|---|---|---|---|
| 400 | `VALIDATION_ERROR` | Body fails schema (format, password rule, mismatch, unknown field) | FR-002, FR-003, FR-017 |
| 400 | `INVALID_CURRENT_PASSWORD` | Change password: current password wrong | FR-021 |
| 401 | `UNAUTHENTICATED` | Missing / invalid / expired access token | FR-013 |
| 401 | `INVALID_CREDENTIALS` | Login failed; message `Invalid email or password` | FR-008 |
| 401 | `SESSION_EXPIRED` | Refresh: no cookie, unknown, ended or past 7 days | FR-011 |
| 403 | `FORBIDDEN` | Role not allowed | FR-014 |
| 403 | `ACCOUNT_BLOCKED` | Login with correct password, or refresh, for a Blocked user; message `Account blocked` | FR-011b, FR-011c |
| 409 | `EMAIL_TAKEN` | Register: email exists; message `Email already registered` | FR-002 |
| 410 | `LINK_EXPIRED` | Reset token used, expired or superseded; message `Link expired` | FR-024 |
| 413 | `FILE_TOO_LARGE` | Photo > 2 MB | FR-018 |
| 415 | `UNSUPPORTED_FILE_TYPE` | Photo not JPG/PNG (by content) | FR-018 |
| 429 | `TOO_MANY_ATTEMPTS` | 5 failed logins in 15 min; `Retry-After` header set | FR-010 |

## Endpoints

### POST /api/auth/register — *public* (US-01)

Request: `{ "fullName", "email", "password", "confirmPassword" }`

| Result | Response |
|---|---|
| Created | `201` AuthResponse · sets `lp_refresh` · user role `STUDENT` |
| Invalid input | `400 VALIDATION_ERROR` |
| Duplicate email (case-insensitive) | `409 EMAIL_TAKEN` |

### POST /api/auth/login — *public* (US-02)

Request: `{ "email", "password" }`

| Result | Response |
|---|---|
| Success | `200` AuthResponse · sets `lp_refresh` · clears failed attempts |
| Wrong password or unknown email | `401 INVALID_CREDENTIALS` · records attempt |
| Correct password, user Blocked | `403 ACCOUNT_BLOCKED` · no session created |
| ≥5 failures in 15 min for this email | `429 TOO_MANY_ATTEMPTS` · attempt not recorded |

Order of checks: block window → credentials → account status.

### POST /api/auth/refresh — *public, cookie* (US-02, clarified)

Request: no body. Uses `lp_refresh`.

| Result | Response |
|---|---|
| Active session, Active user | `200` AuthResponse with **current** role |
| Session missing / ended / expired | `401 SESSION_EXPIRED` · clears cookie |
| User Blocked | `403 ACCOUNT_BLOCKED` · ends session · clears cookie |

### POST /api/auth/logout — *public, cookie* (US-03)

No body. Ends the session for `lp_refresh` if any, clears the cookie. Always `204`
(idempotent).

### GET /api/users/me — auth, any role (US-05)

`200` UserDto.

### PATCH /api/users/me — auth, any role (US-05)

Request (strict; any other field, including `email`, → `400`):
`{ "fullName"?: string(2–100), "bio"?: string(≤500) | null }`

`200` UserDto.

### PUT /api/users/me/photo — auth, any role (US-05)

`multipart/form-data`, field `photo`.

| Result | Response |
|---|---|
| JPG/PNG ≤ 2 MB | `200` UserDto with new `photoUrl` |
| Too large | `413 FILE_TOO_LARGE` · old photo kept |
| Wrong type | `415 UNSUPPORTED_FILE_TYPE` · old photo kept |

### POST /api/users/me/password — auth, any role (US-06)

Request: `{ "currentPassword", "newPassword", "confirmPassword" }`

| Result | Response |
|---|---|
| Changed | `204` · other sessions of the user ended; current `sid` kept |
| Current password wrong | `400 INVALID_CURRENT_PASSWORD` · nothing changed |
| New password breaks rule / mismatch | `400 VALIDATION_ERROR` · nothing changed |

### POST /api/auth/password-reset/request — *public* (US-07)

Request: `{ "email" }` → always `202`
`{ "message": "If an account exists for this email, a reset link has been sent." }`.
Email (if the account exists) is sent after the response.

### GET /api/auth/password-reset/:token — *public* (US-07)

`200 { "valid": true }` or `410 LINK_EXPIRED`.

### POST /api/auth/password-reset/confirm — *public* (US-07)

Request: `{ "token", "newPassword", "confirmPassword" }`

| Result | Response |
|---|---|
| Reset | `204` · token marked used · **all** sessions ended · no login issued |
| Token used / expired / superseded | `410 LINK_EXPIRED` |
| Password rule / mismatch | `400 VALIDATION_ERROR` · token stays valid |

## Access-control middleware (US-04)

- `authenticate`: verifies the bearer JWT; failure → `401 UNAUTHENTICATED`. Sets
  `req.auth = { userId, role, sessionId }`.
- `requireRole(...roles)`: after `authenticate`; role not in list → `403 FORBIDDEN`.
- Every non-public route in this and later features MUST use `authenticate`, and
  role-restricted routes MUST add `requireRole`. EP-01 has no role-restricted business
  endpoints yet; `requireRole` is verified with test-only routes for each role.
