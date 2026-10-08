# UI Contract: Routes, Guards and Menu

**Feature**: [spec.md](../spec.md) · API: [auth-api.md](auth-api.md)

## Routes

| Path | Screen | Guard | Story |
|---|---|---|---|
| `/` | Home (public landing) | — | US-03 |
| `/register` | Sign up | `guestGuard` | US-01 |
| `/login` | Log in | `guestGuard` | US-02 |
| `/forgot-password` | Forgot password | `guestGuard` | US-07 |
| `/reset-password/:token` | Set new password / "Link expired" | — | US-07 |
| `/catalog` | Catalog *(placeholder, EP-02)* | — | US-01 |
| `/profile` | My profile | `authGuard` | US-05 |
| `/profile/password` | Change password | `authGuard` | US-06 |
| `/my-learning` | My Learning *(placeholder, EP-04)* | `roleGuard(STUDENT)` | US-02 |
| `/my-courses` | My Courses *(built in 007: US-13)* | `roleGuard(INSTRUCTOR)` | US-02 |
| `/my-courses/new`, `/my-courses/:id/edit` | Course form *(007: US-12, US-14; edit also ADMIN)* | `roleGuard(INSTRUCTOR[, ADMIN])` | US-12 |
| `/admin/dashboard` | Dashboard *(placeholder, EP-05)* | `roleGuard(ADMIN)` | US-02 |
| `/admin/users` | Users *(007: US-26)* | `roleGuard(ADMIN)` | US-26 |
| `/admin/categories` | Categories *(007: US-27)* | `roleGuard(ADMIN)` | US-27 |

## Guards

- `authGuard`: not signed in → redirect `/login?returnUrl=<path>`.
- `guestGuard`: signed in → redirect to role home.
- `roleGuard(...roles)`: not signed in → `/login`; wrong role → role home (FR-015).

**Role home**: `STUDENT → /my-learning`, `INSTRUCTOR → /my-courses`,
`ADMIN → /admin/dashboard` (FR-009). After register → `/catalog` (FR-006).

## Menu (FR-016)

| Item | Guest | Student | Instructor | Admin |
|---|:-:|:-:|:-:|:-:|
| Catalog | ✓ | ✓ | ✓ | ✓ |
| Log in / Sign up | ✓ | | | |
| My Learning | | ✓ | | |
| My Courses | | | ✓ | |
| Dashboard | | | | ✓ |
| Users / Categories *(added in 007)* | | | | ✓ |
| Profile / Change password / Log out | | ✓ | ✓ | ✓ |

## Interceptor behaviour

- Adds `Authorization: Bearer` to `/api/*` calls when an access token exists.
- On `401` from any call except `/api/auth/*`: run **one** shared refresh; queued requests
  retry after it. Refresh fails (`401`/`403`) → clear auth state, go to `/login`
  (`ACCOUNT_BLOCKED` shows "Account blocked").
- On app start: call refresh once to restore the login from the cookie.

## Visible messages (exact text)

| Case | Text |
|---|---|
| Duplicate email | `Email already registered` |
| Failed login | `Invalid email or password` |
| Blocked account | `Account blocked` |
| Too many attempts | `Too many failed attempts. Try again in N minutes.` |
| Forgot password sent | `If an account exists for this email, a reset link has been sent.` |
| Expired/used link | `Link expired` |
| Profile saved | `Profile updated` |
| Password changed | `Password changed` |

Every screen has loading, error and (where applicable) empty states, and works at 375 px
width and on desktop.
