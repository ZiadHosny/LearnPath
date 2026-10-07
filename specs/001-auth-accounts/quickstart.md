# Quickstart: Validate Authentication & Accounts

How to run the feature and prove each story works. Contracts: [auth-api.md](contracts/auth-api.md),
[ui-routes.md](contracts/ui-routes.md). Data: [data-model.md](data-model.md).

## Prerequisites

- Node.js 24, npm 11, Docker
- Ports free: `5433` (PostgreSQL in Docker; 5433 avoids a local PostgreSQL on 5432),
  `1025`/`8025` (Mailpit), `3000` (API), `4200` (Angular)

## Setup

```bash
docker compose up -d                 # postgres + mailpit
cd backend
cp .env.example .env                 # DATABASE_URL, JWT_SECRET, SMTP_*, APP_URL
npm install                          # also runs prisma generate
npx prisma migrate deploy            # creates schema
npm run db:seed                      # admin / instructor / student / blocked users
npm run dev                          # API on http://localhost:3000

cd ../frontend
npm install
npm start                            # http://localhost:4200, proxies /api → :3000
```

Seed accounts (password `Passw0rd!` in dev): `admin@learnpath.local`,
`instructor@learnpath.local`, `student@learnpath.local`, `blocked@learnpath.local`.
Emails appear at http://localhost:8025.

## Automated checks

```bash
cd backend  && npm test              # API integration tests (uses learnpath_test DB + Mailpit)
cd frontend && npm test              # component, guard, interceptor, service tests
```

Expected: all green; every test name starts with `US-0N Sx`, one or more per acceptance
scenario in [spec.md](spec.md) (SC-006).

## Manual walkthrough (one per story)

| # | Story | Steps | Expected |
|---|---|---|---|
| 1 | US-01 | `/register` with a new email and `abc12345` | Lands on `/catalog`, menu shows Student items |
| 2 | US-01 | Register again with same email in upper case | `Email already registered` |
| 3 | US-01 | Password `abcdefgh` | Password rule error, no account |
| 4 | US-02 | Log in as each seed role | Student → `/my-learning`, Instructor → `/my-courses`, Admin → `/admin/dashboard` |
| 5 | US-02 | Wrong password 5× for student, then correct | 6th attempt refused with "Try again in N minutes" |
| 6 | US-02 | Log in as `blocked@…` with correct password | `Account blocked` |
| 7 | US-02 | Log in, wait > 15 min (or set `ACCESS_TOKEN_TTL=60s`), click around | No interruption (silent renewal) |
| 8 | US-03 | Log out, then open `/profile` | Redirected to `/login` |
| 9 | US-04 | As student open `/admin/dashboard` | Redirected to `/my-learning` |
| 10 | US-04 | `curl -H "Authorization: Bearer <student token>"` on a role-restricted test route | `403 FORBIDDEN`; no token → `401 UNAUTHENTICATED` |
| 11 | US-05 | Edit name/bio, upload 1 MB PNG, reload | Changes kept, `Profile updated` |
| 12 | US-05 | Upload 3 MB JPG, then a `.gif` renamed `.png` | Size error, type error; old photo kept |
| 13 | US-06 | Sign in on two browsers; change password in one | That one stays signed in; the other is sent to login at next renewal |
| 14 | US-06 | Wrong current password | Error, old password still works |
| 15 | US-07 | Forgot password for real and for unknown email | Same message; mail only for real one in Mailpit |
| 16 | US-07 | Open link, set new password, log in | Works; all other browsers signed out |
| 17 | US-07 | Open same link again / request two links and use the first | `Link expired` |

Also check screens at 375 px width (browser dev tools) and on desktop.
