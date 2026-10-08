# Feature Specification: Instructors can start courses (Sprint 2)

**Feature Branch**: `007-instructor-courses`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "Sprint 2 from course-school-user-stories.md: US-26 Assign roles, US-27 Manage categories, US-12 Create a course (draft), US-13 List my courses, US-14 Edit course details"

## Clarifications

### Session 2026-10-08

- Q: How does the admin find the user whose role they change, since the user list is US-25
  (Sprint 6)? → A: Build a minimal user list now (name, email, role, search by name or email,
  pages of 20) with the role change on each row. US-25 later adds status, registered date and
  block/unblock to the same screen.

## User Scenarios & Testing *(mandatory)*

Stories in build order. Priorities: all are Must → P1, ordered by dependency (roles → categories
→ create → list → edit).

### User Story 1 - Assign roles (US-26, Priority: P1)

An admin changes a user's role (Student, Instructor, Admin), which is how a student becomes an
instructor.

**Why this priority**: no one can create courses until someone is an Instructor.

**Independent Test**: as admin, find a student, make them Instructor; after their next renewal
they reach My Courses.

**Acceptance Scenarios**:

1. **Given** an admin, **When** they open Users, **Then** they see users with name, email and
   role, 20 per page, newest first, and can search by part of the name or email (case-insensitive).
2. **Given** an admin and a student, **When** the admin sets the role to Instructor, **Then** the
   role is saved and shown.
3. **Given** the changed user is signed in, **When** their login next renews (within 15 minutes)
   or they sign in again, **Then** the new role applies (pages and menu).
4. **Given** an admin, **When** they try to change their own role away from Admin, **Then** it is
   refused with a clear message and nothing changes.
5. **Given** a non-admin, **When** they call the role change, **Then** it is refused (403).

---

### User Story 2 - Manage categories (US-27, Priority: P1)

An admin adds, renames and deletes course categories.

**Why this priority**: every course needs a category.

**Independent Test**: as admin, add "Programming", rename it, try to delete one used by a course.

**Acceptance Scenarios**:

1. **Given** an admin, **When** they add a category with a new name, **Then** it is listed.
2. **Given** an existing name (in any letter case, ignoring surrounding spaces), **When** they
   add or rename to it, **Then** it is refused: "Category name already exists".
3. **Given** a category no course uses, **When** they delete it, **Then** it disappears.
4. **Given** a category used by N courses, **When** they try to delete it, **Then** it is refused
   and the message says N courses use it.
5. **Given** a non-admin, **When** they call any category change, **Then** it is refused (403);
   anyone signed in can read the list (needed by the course form).

---

### User Story 3 - Create a course as a draft (US-12, Priority: P1)

An instructor creates a course with its basic information; it is saved as a private Draft.

**Why this priority**: the first step of every course.

**Independent Test**: as instructor, create a course; it appears in My Courses as Draft and
nowhere public.

**Acceptance Scenarios**:

1. **Given** an instructor, **When** they submit title, short description, category and level,
   **Then** the course is saved as **Draft**, owned by them, and they land on its edit page.
2. **Given** missing or too-long required fields (title > 120, short description > 250), an
   unknown category or level, **When** they submit, **Then** field errors are shown and nothing
   is saved.
3. **Given** optional fields (full description, "what you will learn" items, thumbnail),
   **When** provided, **Then** they are saved; the thumbnail accepts JPG/PNG up to 2 MB.
4. **Given** a Draft course, **When** anyone looks for public courses, **Then** it never appears
   (checked by the public-visibility rule used later by the catalog).
5. **Given** a student or guest, **When** they try to create a course, **Then** it is refused.

---

### User Story 4 - List my courses (US-13, Priority: P1)

An instructor sees all their own courses in one place.

**Independent Test**: two instructors each create a course; each sees only their own.

**Acceptance Scenarios**:

1. **Given** an instructor with courses, **When** they open My Courses, **Then** each course shows
   title, status (Draft / Published / Archived), number of lessons, number of enrolled students
   and last updated, newest change first.
2. **Given** another instructor's courses, **When** an instructor opens My Courses, **Then** they
   are not listed.
3. **Given** an instructor with no courses, **When** they open My Courses, **Then** an empty state
   invites them to create one.

---

### User Story 5 - Edit course details (US-14, Priority: P1)

The owner (or an admin) edits a course's information with the same rules as creation.

**Independent Test**: edit a course's title; the list shows the new title and a newer update time.

**Acceptance Scenarios**:

1. **Given** the owner, **When** they change details with valid values, **Then** they are saved.
2. **Given** invalid values, **When** they save, **Then** the same field errors as US-12 appear.
3. **Given** an admin, **When** they edit any course, **Then** it is saved.
4. **Given** another instructor or a student, **When** they try to edit, **Then** it is refused
   (403); an unknown course id gives 404.
5. **Given** a new thumbnail, **When** saved, **Then** the old one is removed.

---

### Edge Cases

- Two admins rename two categories to the same name at the same time: one wins, the other gets
  the "already exists" error.
- Deleting a category and creating a course with it at the same time: the course is refused
  (unknown category) or the delete is refused (in use), never a course without a category.
- Changing the role of a user who is Blocked keeps them Blocked.
- An instructor demoted to Student keeps their courses (still owned) but cannot open My Courses
  until promoted again.
- "What you will learn" with empty items: empty items are dropped.

## Requirements *(mandatory)*

### Functional Requirements

**Roles (US-26)**

- **FR-000**: Admins MUST be able to list users (name, email, role), 20 per page, newest first,
  searchable by part of name or email (case-insensitive). Only admins may see this list.
- **FR-001**: Admins MUST be able to set any user's role to Student, Instructor or Admin.
- **FR-002**: An admin MUST NOT be able to change their own role (prevents lockout).
- **FR-003**: The new role MUST apply at the user's next login renewal or sign-in (existing
  renewal already reads the current role).

**Categories (US-27)**

- **FR-004**: Admins MUST be able to add, rename and delete categories.
- **FR-005**: Category names MUST be unique (case-insensitive, trimmed), 2–60 characters.
- **FR-006**: A category used by at least one course MUST NOT be deletable; the refusal MUST say
  how many courses use it.
- **FR-007**: Signed-in users MUST be able to list categories, sorted by name.

**Courses (US-12, US-13, US-14)**

- **FR-008**: Instructors MUST be able to create a course with title (1–120), short description
  (1–250), category (existing) and level (Beginner, Intermediate, Advanced); optional full
  description (up to 5,000), up to 10 "what you will learn" items (each up to 120), thumbnail
  (JPG/PNG up to 2 MB).
- **FR-009**: New courses MUST be Draft and owned by the creating instructor.
- **FR-010**: Only Published courses MAY ever be publicly visible; Draft and Archived MUST NOT.
- **FR-011**: Instructors MUST see only their own courses, with title, status, lesson count,
  enrolled-student count, last updated, sorted by last updated (newest first).
- **FR-012**: The owner or an admin MUST be able to edit a course with the same rules as FR-008;
  others get 403; unknown ids 404.
- **FR-013**: All new screens and messages MUST be available in English and Arabic (EP-06).

### Key Entities

- **Category**: name (unique), created date. Used by courses.
- **Course**: title, short description, full description, learning outcomes (list), level,
  category, thumbnail, status (Draft / Published / Archived), owner (instructor), created and
  last-updated dates.
- **User**: existing; role becomes editable by admins.

## Success Criteria *(mandatory)*

- **SC-001**: An admin can promote a student to instructor in under 30 seconds.
- **SC-002**: An instructor can create a draft course in under 2 minutes.
- **SC-003**: 0 Draft courses are publicly visible (tested).
- **SC-004**: Every acceptance scenario has an automated test; screens work in English and Arabic.

## Assumptions

- Levels: Beginner, Intermediate, Advanced.
- Lesson and enrolled-student counts show 0 until sections/lessons (Sprint 3) and enrollments
  (Sprint 5) exist; the columns are part of the list now so the screen does not change later.
- Course content is shown in the language the instructor wrote it in (not translated).
- Archived exists as a status value now; archiving is done by an admin in US-28 (Sprint 6).
- The thumbnail follows the profile photo rules (JPG/PNG checked by content, ≤ 2 MB).
