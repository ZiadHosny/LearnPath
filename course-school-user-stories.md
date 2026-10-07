# LearnPath — User Stories (Phase 1: Basics)

Sep 29, 2026 · Ziad Hosny

## Overview

LearnPath is an online course school (tagline: "Your way to learn"). Phase 1 delivers a working platform: people sign up, instructors publish courses with lessons, students enroll and track progress, and an admin keeps things in order. Everything else (payments, quizzes, certificates, reviews) comes in later phases.

**Stack:** Angular (frontend) · Node.js + NestJS (REST API) · PostgreSQL · JWT authentication. EP-01 was first built on Express; TS-01 moves the API to NestJS before EP-02.

**Roles**

| Role       | Who                    | Can do in Phase 1                                 |
| ---------- | ---------------------- | ------------------------------------------------- |
| Guest      | Visitor, not logged in | Browse catalog, view course details, register     |
| Student    | Registered learner     | Enroll, open lessons, mark complete, see progress |
| Instructor | Teacher                | Create and publish courses, sections and lessons  |
| Admin      | Platform owner         | Manage users, roles, categories and courses       |

**Story format:** each story has an ID, the user story (_As a … I want … so that …_), a priority (Must / Should / Could), an estimate in story points (1, 2, 3, 5, 8), and acceptance criteria written as testable checks. Build one story end to end (API + Angular screen + test) before starting the next.

## Epics at a glance

Phase 1 has 5 epics and 29 user stories (78 points), plus 3 technical stories (16 points); each epic below lists its stories in build order.

| Epic ID   | Epic                                  | Goal                                                         | Stories       | Count  | Points |
| --------- | ------------------------------------- | ------------------------------------------------------------ | ------------- | ------ | ------ |
| EP-01     | Authentication & accounts             | Users register, log in and reach only what their role allows | US-01 → US-07 | 7      | 19     |
| TECH      | Platform                              | Keep the codebase ready for the next epics                   | TS-01 → TS-03 | 3      | 16     |
| EP-02     | Course catalog                        | Visitors find and evaluate published courses                 | US-08 → US-11 | 4      | 11     |
| EP-03     | Instructor course & lesson management | Instructors build, structure and publish courses             | US-12 → US-18 | 7      | 19     |
| EP-04     | Enrollment & learning                 | Students enroll, study lessons and track progress            | US-19 → US-24 | 6      | 16     |
| EP-05     | Admin basics                          | Admin manages users, roles, categories and courses           | US-25 → US-29 | 5      | 13     |
| **Total** |                                       |                                                              |               | **32** | **94** |

## EP-01 · Epic: Authentication & accounts

This epic comes first: every other story depends on knowing who the user is and what role they have.

### US-01 Register an account — Must · 3 pts

As a **guest**, I want to create an account with my name, email and password, so that I can enroll in courses.

- Form fields: full name, email, password, confirm password.
- Email must be valid and unique; duplicate email shows "Email already registered".
- Password is at least 8 characters with one letter and one number.
- Password is stored hashed (bcrypt), never in plain text.
- New accounts get the role **Student** by default.
- On success the user is logged in and redirected to the catalog.

### US-02 Log in — Must · 3 pts

As a **registered user**, I want to log in with email and password, so that I can reach my courses.

- Correct credentials return a JWT access token; Angular stores it and sends it on every API call (HTTP interceptor).
- Wrong credentials show a generic "Invalid email or password" message.
- After login, users land on their home page by role (Student → My Learning, Instructor → My Courses, Admin → Dashboard).
- Five failed attempts in 15 minutes temporarily block that email.

### US-03 Log out — Must · 1 pt

As a **logged-in user**, I want to log out, so that nobody else can use my account on this device.

- Logout clears the token and redirects to the home page.
- Protected pages are no longer reachable after logout (route guard redirects to login).

### US-04 Role-based access — Must · 3 pts

As the **platform owner**, I want each page and API to check the user's role, so that students cannot do instructor or admin actions.

- API middleware rejects missing/invalid tokens with 401 and wrong roles with 403.
- Angular route guards hide and block pages the role cannot use.
- Menu items shown depend on the role.

### US-05 View and edit my profile — Should · 2 pts

As a **logged-in user**, I want to view and update my name, photo and short bio, so that my profile is current.

- Email is shown but not editable in Phase 1.
- Photo upload accepts JPG/PNG up to 2 MB.
- Changes save and show a success message.

### US-06 Change password — Should · 2 pts

As a **logged-in user**, I want to change my password, so that I can keep my account secure.

- Requires the current password plus a new password meeting US-01 rules.
- Wrong current password shows an error and changes nothing.

### US-07 Reset forgotten password — Could · 5 pts

As a **registered user**, I want to reset my password by email, so that I can get back in if I forget it.

- "Forgot password" sends a reset link valid for 1 hour.
- The link works once; after use or expiry it shows "Link expired".
- The response is the same whether or not the email exists (no account leaking).

## TECH · Platform

Technical stories have no end-user screen; they change how the system is built, not what it does.

### TS-01 Move the API from Express to NestJS — Must · 8 pts

As the **development team**, I want the API built on NestJS with one module per feature, so that the next epics follow one clear structure and the API documentation is generated from the code.

- The API runs on NestJS with feature modules `auth`, `users`, `password-reset`, plus shared `common/` (guards, decorators, exception filter), `prisma/` and `mail/` modules.
- All 11 EP-01 endpoints keep the same paths, request bodies, responses, status codes, cookie and error format, so the Angular app needs no change.
- The existing API tests for US-01 → US-07 pass against the NestJS app with no change to what they check (only the test app setup may change).
- Login is checked by a guard (missing, invalid or expired token → 401); roles are declared with `@Roles(...)` and checked by a roles guard (wrong role → 403).
- API documentation is generated from the code (`@nestjs/swagger`): Swagger UI at `/api/docs` and `/api/openapi.json` in development only, listing every endpoint without a hand-written list; Apidog import still works.
- No new features and no database changes: the Prisma schema and migrations stay as they are.

### TS-02 Align the API with the NestJS 12 defaults — Must · 5 pts

As the **development team**, I want the API set up the way a new NestJS 12 project is, so that the docs, examples and `nest g` generators fit our code and no experimental runtime flags are needed.

- The API runs as an ES module project (`"type": "module"`), like `nest new` in NestJS 12; no `--experimental-vm-modules` flag anywhere.
- Backend tests run on Vitest (the NestJS 12 default and the tool the web app already uses); every existing test passes without changing what it checks.
- The standard NestJS 12 scripts exist (`start:dev`, `start:debug`, `start:prod`, `test:watch`, `test:cov`, `test:e2e`, `format`); the existing short names keep working.
- `rxjs` is a direct dependency, and start-up logs go through Nest's `Logger`.
- No behaviour change for clients: same endpoints, errors, cookies, docs; the web app is not modified.

### TS-03 Colored, customizable logging — Should · 3 pts

As the **development team**, I want one global, colored logger with clear levels and story tags, so that we can follow what the API is doing and spot errors and successes at a glance.

- One logger is used by NestJS itself and by our code; every line shows time, level, source and message.
- Levels each have their own color and label: error (red), warn (yellow), success (green, new), log (cyan), debug (magenta), verbose (gray).
- A log can carry the user story it belongs to, shown as a tag such as `[US-02]`.
- It is customizable: minimum level (`LOG_LEVEL`), colors on/off/auto (`LOG_COLORS`, also respects `NO_COLOR`) and format pretty or JSON (`LOG_FORMAT`); each level's color and label can be changed in one config file.
- Every API request is logged with method, path, status and duration, colored by status; bodies, headers, passwords and tokens are never logged (tokens in paths are masked).
- Account events are logged with their story tag: sign-up, login (success and failure), logout, password change, reset requested and done, using the user id only (no email, password or token).
- No change to API behaviour or responses.

## EP-02 · Epic: Course catalog

The catalog is the public face of the school: anyone can find and read about published courses without logging in.

### US-08 Browse published courses — Must · 3 pts

As a **guest or student**, I want to see a list of available courses, so that I can find something to learn.

- Shows only courses with status **Published**.
- Each card shows thumbnail, title, instructor name, category, level and number of lessons.
- 12 courses per page with pagination.
- Empty state: "No courses yet".

### US-09 Search courses — Must · 2 pts

As a **visitor**, I want to search by keyword, so that I can find a course quickly.

- Searches course title and short description (case-insensitive).
- Results update after typing stops (300 ms debounce) or on Enter.
- No match shows "No courses match your search".

### US-10 Filter by category and level — Should · 3 pts

As a **visitor**, I want to filter by category and level (Beginner / Intermediate / Advanced), so that I see only relevant courses.

- Filters combine with search.
- Active filters are kept in the URL query string, so the page can be shared or refreshed.
- A "Clear filters" button resets everything.

### US-11 View course details — Must · 3 pts

As a **visitor**, I want to open a course page, so that I can decide whether to enroll.

- Shows title, full description, what you will learn, instructor (name, photo, bio), category, level, total lessons and duration.
- Shows the curriculum: sections and lesson titles only (content is locked until enrollment).
- Shows an **Enroll** button (guests are sent to login first, then returned to this course).
- Unpublished or unknown course IDs show a 404 page.

## EP-03 · Epic: Instructor course & lesson management

Instructors build courses as **Course → Sections → Lessons**; a course stays a private Draft until the instructor publishes it.

### US-12 Create a course (draft) — Must · 3 pts

As an **instructor**, I want to create a new course with its basic info, so that I can start building it.

- Required: title (max 120 chars), short description (max 250), category, level.
- Optional: full description, "what you will learn" list, thumbnail image.
- New courses are saved with status **Draft** and owned by the instructor.
- Drafts never appear in the public catalog.

### US-13 List my courses — Must · 2 pts

As an **instructor**, I want to see all courses I own, so that I can manage them in one place.

- Shows title, status (Draft / Published / Archived), number of lessons, number of enrolled students, last updated.
- An instructor sees only their own courses.

### US-14 Edit course details — Must · 2 pts

As an **instructor**, I want to edit my course info, so that I can fix and improve it.

- Same validation as US-12.
- Only the owner (or an admin) can edit; others get 403.

### US-15 Manage sections — Must · 3 pts

As an **instructor**, I want to add, rename, reorder and delete sections, so that my course has a clear structure.

- Sections have a title and an order number.
- Reorder by drag and drop (Angular CDK) and the order is saved.
- Deleting a section that has lessons asks for confirmation and deletes its lessons too.

### US-16 Add and edit lessons — Must · 5 pts

As an **instructor**, I want to add lessons to a section, so that students have content to learn.

- Lesson fields: title, type (**Video** or **Text/Article**), content, duration in minutes.
- Video lessons take a video URL (e.g. YouTube/Vimeo or uploaded file link); text lessons use a rich-text editor.
- Lessons can be edited, reordered within a section and deleted.
- A lesson can be marked **Free preview** so guests can open it from the course page.

### US-17 Publish / unpublish a course — Must · 2 pts

As an **instructor**, I want to publish my course when ready, so that students can find and enroll in it.

- Publish is allowed only if the course has a title, description, thumbnail and at least 1 section with 1 lesson; otherwise the missing items are listed.
- Published courses appear in the catalog immediately.
- Unpublish moves it back to Draft; already-enrolled students keep access.

### US-18 Preview course as a student — Could · 2 pts

As an **instructor**, I want to preview my course the way a student sees it, so that I can check it before publishing.

- Opens the student learning view in read-only mode without creating an enrollment.

## EP-04 · Epic: Enrollment & learning

All courses are free in Phase 1, so enrolling is one click; payments come in a later phase.

### US-19 Enroll in a course — Must · 3 pts

As a **student**, I want to enroll in a published course, so that I can access its lessons.

- Clicking **Enroll** creates an enrollment (student, course, enrolled date).
- A student cannot enroll twice; the button changes to **Continue learning**.
- After enrolling, the student goes straight to the first lesson.

### US-20 My Learning dashboard — Must · 3 pts

As a **student**, I want to see all courses I am enrolled in, so that I can pick up where I left off.

- Each course shows thumbnail, title, instructor and progress bar (% of lessons completed).
- **Continue** opens the last lesson viewed (or the first lesson if none).
- Empty state links to the catalog.

### US-21 Watch / read a lesson — Must · 5 pts

As an **enrolled student**, I want to open lessons in a learning view, so that I can study the course content.

- Layout: lesson content in the main area, curriculum sidebar with sections and lessons.
- Video lessons play embedded; text lessons render formatted content.
- **Previous / Next** buttons move through lessons in order.
- Non-enrolled users opening a lesson URL are redirected to the course page (except Free preview lessons).

### US-22 Mark lesson as complete — Must · 2 pts

As an **enrolled student**, I want to mark a lesson complete, so that I can track what I have finished.

- A **Mark as complete** button toggles completion; completed lessons show a check in the sidebar.
- Completion is saved per student per lesson and survives logout.

### US-23 Course progress — Must · 2 pts

As an **enrolled student**, I want to see my progress in a course, so that I know how much is left.

- Progress = completed lessons ÷ total lessons, shown as a percentage and bar.
- At 100% the course shows **Completed** with the completion date.
- If the instructor adds lessons later, the percentage recalculates.

### US-24 Leave a course — Could · 1 pt

As a **student**, I want to unenroll from a course, so that my dashboard shows only what I am studying.

- Requires confirmation; progress is deleted with the enrollment.

## EP-05 · Epic: Admin basics

The admin keeps the platform in order; the first admin account is created with a seed script, not the sign-up form.

### US-25 Manage users — Must · 3 pts

As an **admin**, I want to see and search all users, so that I can support and control accounts.

- Table with name, email, role, status (Active / Blocked), registered date; search by name or email; pagination.
- Admin can block and unblock a user; blocked users cannot log in and see "Account blocked".

### US-26 Assign roles — Must · 2 pts

As an **admin**, I want to change a user's role, so that I can approve instructors.

- Roles: Student, Instructor, Admin.
- An admin cannot remove their own Admin role (prevents lockout).
- The new role applies at the user's next login or token refresh.

### US-27 Manage categories — Must · 2 pts

As an **admin**, I want to add, rename and delete course categories, so that the catalog stays organized.

- Category names are unique.
- A category used by any course cannot be deleted (show how many courses use it).

### US-28 Manage all courses — Should · 3 pts

As an **admin**, I want to see every course and unpublish or archive any of them, so that I can remove low-quality or rule-breaking content.

- List shows title, instructor, status, students, created date, with filter by status.
- Admin can unpublish or archive; archived courses disappear from the catalog but enrolled students keep access.

### US-29 Admin dashboard — Could · 3 pts

As an **admin**, I want a simple dashboard, so that I can see how the school is doing at a glance.

- Totals: users by role, published courses, enrollments, and new sign-ups in the last 7 days.

## Build order & definition of done

Build in this order so each sprint ends with something you can demo; Phase 1 totals 29 user stories (78 points) plus TS-01 → TS-03 (16 points).

| Sprint | Goal                             | Stories                                                           | Points |
| ------ | -------------------------------- | ----------------------------------------------------------------- | ------ |
| 0      | Project setup                    | Angular app, Node/Express API, database, seed admin user, CI/lint | —      |
| 1      | People can sign in               | US-01, US-02, US-03, US-04                                        | 10     |
| 1b     | Move the API to NestJS           | TS-01                                                             | 8      |
| 1c     | Align the API with NestJS 12     | TS-02                                                             | 5      |
| 1d     | Colored, customizable logging    | TS-03                                                             | 3      |
| 2      | Instructors can start courses    | US-26, US-27, US-12, US-13, US-14                                 | 11     |
| 3      | Courses have content and go live | US-15, US-16, US-17                                               | 10     |
| 4      | Public catalog                   | US-08, US-09, US-11                                               | 8      |
| 5      | Students can learn               | US-19, US-20, US-21                                               | 11     |
| 6      | Progress + admin control         | US-22, US-23, US-25, US-28                                        | 10     |
| 7      | Polish (Should / Could)          | US-05, US-06, US-10, US-07, US-18, US-24, US-29                   | 18     |

**Core data entities:** User, Category, Course, Section, Lesson, Enrollment, LessonProgress.

**Definition of done (every story)**

- [ ] API endpoint(s) built with input validation and role checks
- [ ] Angular screen built, with loading, empty and error states
- [ ] All acceptance criteria pass when tested by hand
- [ ] At least one automated test (API or component)
- [ ] Works on mobile width (375 px) and desktop
- [ ] Code merged to main and running on the dev environment

**Later phases (not in Phase 1):** payments and paid courses, quizzes and assignments, certificates, ratings and reviews, discussion / Q&A, notifications, Arabic/English (RTL) support.
