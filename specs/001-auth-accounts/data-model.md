# Data Model: Authentication & Accounts

**Feature**: [spec.md](spec.md) | **Research**: [research.md](research.md)

PostgreSQL via Prisma. All ids are UUIDs. All timestamps are `timestamptz`, stored in UTC.

## Enums

| Enum | Values | Notes |
|---|---|---|
| `Role` | `STUDENT`, `INSTRUCTOR`, `ADMIN` | Guest = no login; not stored |
| `UserStatus` | `ACTIVE`, `BLOCKED` | Default `ACTIVE` |

## users

| Field | Type | Rules |
|---|---|---|
| `id` | uuid, PK | |
| `full_name` | varchar(100) | Required, trimmed, 2–100 chars |
| `email` | varchar(254), **unique** | Stored trimmed + lower-case (case-insensitive uniqueness); valid email format; not editable after creation |
| `password_hash` | varchar(60) | bcrypt hash, cost 12. Never selected into API responses |
| `role` | `Role` | Default `STUDENT` (FR-005) |
| `status` | `UserStatus` | Default `ACTIVE` (FR-011b) |
| `photo_path` | varchar(255), nullable | Relative path under `uploads/avatars/` |
| `bio` | varchar(500), nullable | ≤ 500 chars |
| `created_at` | timestamptz | Default now |
| `updated_at` | timestamptz | Updated on change |

**Password rule** (input only, FR-003): length ≥ 8, at least one letter `[A-Za-z]`, at least
one digit `[0-9]`; confirmation must match.

## sessions

One row per signed-in device (spec: *Login session*).

| Field | Type | Rules |
|---|---|---|
| `id` | uuid, PK | Carried in the access token as `sid` |
| `user_id` | uuid, FK → users.id | `ON DELETE CASCADE`; indexed |
| `refresh_token_hash` | char(64), **unique** | SHA-256 hex of the cookie value |
| `created_at` | timestamptz | Sign-in time |
| `expires_at` | timestamptz | `created_at + 7 days`; never extended |
| `ended_at` | timestamptz, nullable | Set on logout, password change (others), reset (all), block detected on refresh |

A session is **active** when `ended_at IS NULL AND expires_at > now()`.

```text
            sign-in                 logout / pw change (other) / pw reset / blocked on refresh
  (none) ──────────▶ ACTIVE ─────────────────────────────────────────────▶ ENDED
                        │
                        └── now() ≥ expires_at ─────────────────────────▶ EXPIRED
```

## login_attempts

Failed attempts only (FR-010). Not linked to users, so unknown emails are treated the same.

| Field | Type | Rules |
|---|---|---|
| `id` | bigserial, PK | |
| `email` | varchar(254) | Normalised like `users.email`; index `(email, attempted_at)` |
| `attempted_at` | timestamptz | Default now |

- Blocked when the 5 most recent failures for the email fall within 15 minutes of each other
  **and** `now() < (most recent failure).attempted_at + 15 min` — i.e. the block lasts 15
  minutes from the fifth failure (FR-010).
- No row inserted while blocked; all rows for the email deleted on successful login.
- Rows older than 30 minutes can be pruned at any time.

## password_reset_tokens

| Field | Type | Rules |
|---|---|---|
| `id` | uuid, PK | |
| `user_id` | uuid, FK → users.id | `ON DELETE CASCADE`; indexed |
| `token_hash` | char(64), **unique** | SHA-256 hex of the link token |
| `created_at` | timestamptz | |
| `expires_at` | timestamptz | `created_at + 1 hour` |
| `used_at` | timestamptz, nullable | Set when the reset succeeds |

- **Valid** when `used_at IS NULL AND expires_at > now()`; otherwise the screen shows
  "Link expired" (FR-024).
- Issuing a new token deletes the user's other unused tokens (FR-025).

```text
   issued ──▶ VALID ──── reset succeeds ──▶ USED
                │
                ├── now() ≥ expires_at ─▶ EXPIRED
                └── newer token issued ─▶ (deleted)
```

## Relationships

```text
users 1 ──── * sessions
users 1 ──── * password_reset_tokens
login_attempts: keyed by email, no FK
```

## Derived / API shapes

`UserDto` returned by the API (never includes `password_hash` or `status` internals beyond
what the UI needs):

```json
{ "id": "uuid", "fullName": "string", "email": "string",
  "role": "STUDENT|INSTRUCTOR|ADMIN", "photoUrl": "string|null", "bio": "string|null" }
```
