# Implementation Plan: Instructors can start courses (Sprint 2)

**Branch**: `007-instructor-courses` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

## Summary

Three new API modules and four new screens. `admin-users` (list/search users, change role),
`categories` (CRUD, unique names, in-use guard) and `courses` (create draft, my courses, get,
edit, thumbnail). Images share one storage helper with profile photos. All texts in en/ar.

## Technical Context

Same stack as before (NestJS 12 ESM, Prisma 7, Angular 22, Vitest). No new dependencies.
**Storage**: migration `add_categories_and_courses` (tables `categories`, `courses`; enums
`CourseLevel`, `CourseStatus`); files in `uploads/thumbnails/`.

## Constitution Check

| Principle | Status |
|---|---|
| I. Vertical slices | ✅ each story: API + screen + tests, in build order |
| II. Tests | ✅ every acceptance scenario mapped in tasks |
| III. Server validation | ✅ DTOs with translation-key messages |
| IV. Roles both sides | ✅ `@Roles('ADMIN')` / `@Roles('INSTRUCTOR')` + owner check; `roleGuard` routes |
| V. Phase scope | ✅ Sprint 2 stories only; US-25 slice limited to what US-26 needs (clarified) |

## Data model

| Table | Fields |
|---|---|
| `categories` | `id` uuid · `name` varchar(60) · `name_key` varchar(60) **unique** (trimmed lower-case) · `created_at` |
| `courses` | `id` uuid · `title` varchar(120) · `short_description` varchar(250) · `description` varchar(5000) null · `learning_outcomes` text[] (≤ 10 × 120) · `level` enum(BEGINNER, INTERMEDIATE, ADVANCED) · `category_id` → categories (**restrict** delete) · `thumbnail_path` null · `status` enum(DRAFT, PUBLISHED, ARCHIVED) default DRAFT · `owner_id` → users (restrict) · `created_at` · `updated_at`; index (`owner_id`, `updated_at`) |

## API (all under `/api`, JSON, errors as before)

| Method | Path | Who | Notes |
|---|---|---|---|
| GET | `/admin/users?search=&page=` | ADMIN | `{ items: [{ id, fullName, email, role }], total, page, pageSize: 20 }`, newest first |
| PATCH | `/admin/users/:id/role` | ADMIN | `{ role }`; own id → `400 CANNOT_CHANGE_OWN_ROLE`; unknown → 404 |
| GET | `/categories` | signed in | sorted by name, each with `courseCount` |
| POST | `/categories` | ADMIN | `{ name }` → 201; duplicate → `409 CATEGORY_EXISTS` |
| PATCH | `/categories/:id` | ADMIN | `{ name }`; duplicate → 409 |
| DELETE | `/categories/:id` | ADMIN | 204; in use → `409 CATEGORY_IN_USE` ("used by {{count}} courses") |
| POST | `/courses` | INSTRUCTOR | create Draft → 201 course |
| GET | `/courses/mine` | INSTRUCTOR | own courses, newest update first, with `lessonCount`, `studentCount` (0 for now) |
| GET | `/courses/:id` | owner or ADMIN | full course for the edit page |
| PATCH | `/courses/:id` | owner or ADMIN | same rules as create |
| PUT | `/courses/:id/thumbnail` | owner or ADMIN | JPG/PNG ≤ 2 MB, old file removed |

New error codes (catalog + en/ar): `CANNOT_CHANGE_OWN_ROLE` (400), `CATEGORY_EXISTS` (409),
`CATEGORY_IN_USE` (409). `AppError` gains `params` for `{{count}}`.

`PUBLIC_COURSE_WHERE = { status: 'PUBLISHED' }` is the single public-visibility rule (tested now,
used by the catalog in Sprint 4).

## Web app

| Route | Screen | Guard |
|---|---|---|
| `/admin/users` | Users (search, pages, role select per row; own row locked) | ADMIN |
| `/admin/categories` | Categories (add, rename inline, delete with message) | ADMIN |
| `/my-courses` | My Courses (table, status chip, counts, updated date, "New course", empty state) | INSTRUCTOR |
| `/my-courses/new` | Course form (create) | INSTRUCTOR |
| `/my-courses/:id/edit` | Course form (edit + thumbnail) | INSTRUCTOR or ADMIN |

Header: Admin menu gains Users and Categories (intentional change to the 001 menu table).
`I18nService.date()` formats dates with the language locale.
