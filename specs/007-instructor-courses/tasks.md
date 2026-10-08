---

description: "Task list for 007-instructor-courses (Sprint 2)"
---

# Tasks: Instructors can start courses (Sprint 2)

**Input**: [spec.md](spec.md), [plan.md](plan.md) · **Tests**: REQUIRED, written first per story.

## Phase 1: Foundation

- [X] T001 Prisma: `Category`, `Course`, enums `CourseLevel`, `CourseStatus`, `User.courses`; migration `add_categories_and_courses`
- [X] T002 Error codes `CANNOT_CHANGE_OWN_ROLE` (400), `CATEGORY_EXISTS` (409), `CATEGORY_IN_USE` (409) in `error-catalog.ts` and en/ar; `AppError` `params` option used by `toErrorBody`
- [X] T003 Shared image storage `backend/src/common/files/image-storage.service.ts` (content check, save under a folder, remove old); `PhotoService` uses it

## Phase 2: US1 Assign roles (US-26)

- [X] T004 [US1] Tests `backend/tests/integration/us26-assign-roles.test.ts`: list (20/page, newest first, search name/email case-insensitive), admin only (401/403); change role → saved, renewal returns new role; own role → 400 `CANNOT_CHANGE_OWN_ROLE`; unknown id → 404; invalid role → 400; blocked user stays blocked
- [X] T005 [US1] `backend/src/modules/admin-users/` (module, controller, service, dto)
- [X] T006 [US1] Web: `features/admin/users/` screen + service + spec (search, pages, role change, own row locked, error shown); route `/admin/users`; header link; en/ar texts

## Phase 3: US2 Categories (US-27)

- [X] T007 [US2] Tests `backend/tests/integration/us27-categories.test.ts`: add/list sorted; duplicate (case/space) → 409; rename; rename to existing → 409; delete unused → 204; delete used → 409 with count in message; non-admin changes → 403; signed-in read OK; guest 401
- [X] T008 [US2] `backend/src/modules/categories/`
- [X] T009 [US2] Web: `features/admin/categories/` screen + service + spec; route; header link; en/ar

## Phase 4: US3–US5 Courses (US-12, US-13, US-14)

- [X] T010 [US3] Tests `backend/tests/integration/us12-us14-courses.test.ts`: create Draft owned by instructor (201); validation limits (title 120, short 250, description 5000, ≤10 outcomes × 120, empty outcomes dropped, unknown category/level); thumbnail JPG/PNG ≤ 2 MB, wrong type 415, too big 413; student/guest refused; `PUBLIC_COURSE_WHERE` excludes Draft/Archived; my courses only own, newest update first, counts 0; edit by owner/admin, others 403, unknown 404; new thumbnail removes old
- [X] T011 [US3] `backend/src/modules/courses/` (module, controller, service, dto, `PUBLIC_COURSE_WHERE`)
- [X] T012 [US3] Web: `features/courses/` — My Courses list (empty state, status chips, dates), course form (create/edit, outcomes list, category/level selects, thumbnail in edit), service, specs; routes replace the My Courses placeholder; en/ar

## Phase 5: Polish

- [X] T013 `I18nService.date()`; header spec menu table updated (Admin: Users, Categories); Swagger shows new endpoints (openapi test list); full backend + frontend suites, lint, build, walkthrough; README/stories notes
