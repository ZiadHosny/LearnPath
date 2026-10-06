# LearnPath

An online course school — *"Your way to learn"*. Phase 1 lets people sign up, instructors
publish courses, students enroll and track progress, and an admin keep things in order.
User stories: [course-school-user-stories.md](course-school-user-stories.md).

| Part | Stack | Folder |
|---|---|---|
| Frontend | Angular 22, Angular Material | [frontend/](frontend/) |
| API | Node.js 24, NestJS 12, TypeScript, Prisma | [backend/](backend/) |
| API docs | Swagger UI (development only) | http://localhost:3000/api/docs |
| Database | PostgreSQL 17 (Docker) | [docker-compose.yml](docker-compose.yml) |
| Dev email | Mailpit (Docker) | http://localhost:8025 |

The project is built with [Spec Kit](https://github.com/github/spec-kit): principles in
[.specify/memory/constitution.md](.specify/memory/constitution.md), one folder per feature
under [specs/](specs/).

## Run it

Needs Node.js 24, npm and Docker (Docker Desktop running). Everything runs from the
project root:

```bash
npm install          # once: installs the root runner (concurrently)
npm run setup        # once: Docker services, backend + frontend deps, migrations, seed
npm run dev          # every day: Docker services + API (:3000) + web (:4200) in one terminal
```

Before the first `npm run setup`, create `backend/.env` from `backend/.env.example` and set
`JWT_SECRET` to a long random string.

| Command | What it does |
|---|---|
| `npm run dev` | Starts Docker services, then API and web together (Ctrl+C stops both) |
| `npm run dev:api` / `npm run dev:web` | Only the API / only the web app |
| `npm test` | Backend then frontend tests |
| `npm run test:api` / `npm run test:web` | One side only |
| `npm run lint` | ESLint + typecheck (backend), ESLint (frontend) |
| `npm run build` | Production builds of both |
| `npm run db:migrate` | After editing `schema.prisma`: new migration + regenerate client |
| `npm run db:deploy` | Apply pending migrations (after `git pull`) |
| `npm run db:status` | Show whether the database is up to date |
| `npm run db:seed` | Create / update the seed accounts |
| `npm run db:studio` | Browse the database in the browser (Prisma Studio) |
| `npm run services:up` / `services:down` | Start / stop PostgreSQL and Mailpit |
| `npm run services:logs` | Follow Docker service logs |
| `npm run openapi` | Write `backend/openapi.json` (all endpoints) for Apidog / Postman. Also served live at http://localhost:3000/api/openapi.json while the API runs |

The same steps by hand, per project:

```bash
docker compose up -d                 # PostgreSQL on :5433, Mailpit on :1025 / :8025

cd backend
cp .env.example .env                 # then set JWT_SECRET to a long random string
npm install                          # also generates the Prisma client
npx prisma migrate deploy
npm run db:seed                      # admin / instructor / student / blocked accounts
npm run dev                          # API on http://localhost:3000

cd ../frontend
npm install
npm start                            # http://localhost:4200 (proxies /api and /uploads)
```

Seed accounts, password `Passw0rd!`: `admin@learnpath.local`, `instructor@learnpath.local`,
`student@learnpath.local`, `blocked@learnpath.local`.

PostgreSQL is published on port **5433** so it does not clash with a local PostgreSQL on 5432.

## Test it

```bash
cd backend  && npm test              # API tests against the learnpath_test database + Mailpit
cd frontend && npm test              # component, guard and service tests
```

Full walkthrough per story: [specs/001-auth-accounts/quickstart.md](specs/001-auth-accounts/quickstart.md).
