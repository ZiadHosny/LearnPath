# Traceability: Authentication & Accounts

**Purpose**: Show that every acceptance scenario in [spec.md](../spec.md) has an automated test
(constitution II, SC-006), and record the quickstart walkthrough.
**Updated**: 2026-10-01

Test files: backend `backend/tests/integration/usNN-*.test.ts` (API, real PostgreSQL + Mailpit);
frontend `frontend/src/app/**/*.spec.ts` (components, guards, interceptor, services).
Test names start with the scenario id, so `grep "US-02 S5"` finds every test for a scenario.

## Acceptance scenarios

| Scenario | Backend (API) | Frontend (UI) |
|---|---|---|
| US-01 S1 sign-up → Student, logged in, catalog | us01-register | register.component.spec |
| US-01 S2 duplicate email | us01-register | register.component.spec |
| US-01 S3 malformed email (and name length) | us01-register | register.component.spec |
| US-01 S4 password rule | us01-register | register.component.spec |
| US-01 S5 confirmation mismatch | us01-register | register.component.spec |
| US-01 S6 password stored only as hash | us01-register | — (server-only) |
| US-02 S1–S3 role landing | us02-login | login.component.spec, auth.service.spec |
| US-02 S4 generic failure message | us02-login | login.component.spec |
| US-02 S5 5-in-15-minutes block | us02-login | login.component.spec |
| US-02 S6 recognised without logging in again | us02-login | auth.interceptor.spec, auth.service.spec |
| US-02 S7 Blocked account refused | us02-login | login.component.spec |
| US-02 S8 blocked after login → refused at renewal | us02-login | auth.interceptor.spec, login.component.spec |
| US-03 S1 logout clears login, goes home | us03-logout | header.component.spec |
| US-03 S2 protected page after logout → login | — (UI-only) | auth.guards.spec |
| US-04 S1 missing/invalid/expired login → 401 | us04-access | auth.interceptor.spec |
| US-04 S2 wrong role → 403 | us04-access | — (server-only) |
| US-04 S3 wrong-role page redirected | — (UI-only) | auth.guards.spec |
| US-04 S4 menu per role | — (UI-only) | header.component.spec |
| US-05 S1 view profile, email read-only | us05-profile | profile.component.spec |
| US-05 S2 save name/bio, success message | us05-profile | profile.component.spec |
| US-05 S3 JPG/PNG ≤ 2 MB upload | us05-profile | profile.component.spec |
| US-05 S4 too large / wrong type refused, old kept | us05-profile | profile.component.spec |
| US-06 S1 change, this device kept, others out | us06-change-password | change-password.component.spec |
| US-06 S2 wrong current password | us06-change-password | change-password.component.spec |
| US-06 S3 new password rule / mismatch | us06-change-password | change-password.component.spec |
| US-07 S1 same answer for any email | us07-password-reset | forgot-password.component.spec |
| US-07 S2 link emailed to registered address | us07-password-reset | — (server-only) |
| US-07 S3 fresh link resets, all devices out | us07-password-reset | reset-password.component.spec |
| US-07 S4 used / expired / superseded → "Link expired" | us07-password-reset | reset-password.component.spec |

**Result**: 36 of 36 scenarios covered. Clarified requirements FR-011, FR-011a, FR-011b,
FR-011c, FR-021a, FR-025 and FR-026 are covered by the same files (tests tagged `FR-011`,
`FR-011a`, or listed under the scenario that exercises them). Edge cases (case-insensitive
email, block not extended, counter cleared, parallel renewals, unknown reset token, reset
does not unblock) are tagged `edge` or live under S5/S4.

## Test runs (2026-10-01)

| Suite | Result |
|---|---|
| Backend `npm test` | 59 / 59 passed |
| Frontend `npm test` | 55 / 55 passed |

## Quickstart walkthrough (2026-10-01)

Scripted over real HTTP through the Angular dev proxy (`localhost:4200` → API `:3000`,
PostgreSQL in Docker, Mailpit). 31 / 31 checks passed:

| Step | Result |
|---|---|
| App pages `/`, `/register`, `/login`, `/catalog`, `/forgot-password`, `/profile` served | ✅ |
| 1–3 US-01 register; duplicate in upper case; rule violation | ✅ |
| 4 US-02 seed Student / Instructor / Admin log in with their role | ✅ |
| 5 US-02 sixth attempt blocked, `Retry-After: 900` | ✅ |
| 6 US-02 `blocked@learnpath.local` → "Account blocked" | ✅ |
| 7 US-02 renewal through the proxy with the `/api/auth` cookie | ✅ |
| 8 US-03 logout; renewal afterwards refused | ✅ |
| 10 US-04 no token → 401 | ✅ |
| 11–12 US-05 bio saved; PNG uploaded and served; 3 MB → 413; fake GIF → 415 | ✅ |
| 13–14 US-06 wrong current → 400; change → this device kept, other signed out | ✅ |
| 15–17 US-07 same answer; one mail in Mailpit; reset + login; reused link → "Link expired" | ✅ |

**Not done by hand**: step 9 (browser redirect for a wrong-role page) and the 375 px /
desktop visual check need a person with a browser. Both behaviours are covered by
`auth.guards.spec` and the responsive header/form styles, but have not been looked at on a
real screen.
