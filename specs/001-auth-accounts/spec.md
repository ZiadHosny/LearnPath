# Feature Specification: Authentication & Accounts

**Feature Branch**: `001-auth-accounts`

**Created**: 2026-09-30

**Status**: Draft

**Input**: User description: "EP-01 Authentication & accounts: US-01 → US-07 from course-school-user-stories.md"

## Clarifications

### Session 2026-09-30

- Q: Which stories does this feature cover and build now? → A: All seven (US-01 → US-07) are
  in scope and built in this feature, ahead of the Sprint 7 placement in the source build order.
- Q: How long does a login stay valid, and is there a token refresh? → A: Short-lived login
  (15 minutes), renewed automatically in the background for up to 7 days; role changes take
  effect within 15 minutes.
- Q: What happens to logins on other devices after a password change or reset? → A: Change
  ends all other sessions and keeps the current device signed in; reset ends all sessions.
- Q: Is account status (Active/Blocked) enforced at login in this feature? → A: Yes. Users
  have a status now; sign-in and renewal refuse Blocked accounts, "Account blocked" is shown
  only after a correct password; the admin block/unblock screen stays in EP-05 (US-25).

## User Scenarios & Testing *(mandatory)*

Stories are listed in build order. Priorities map to the source document: Must → P1,
Should → P2, Could → P3. Each story is built and tested end to end before the next starts.

### User Story 1 - Register an account (US-01, Priority: P1)

A guest creates an account with full name, email, password and password confirmation.
On success they are logged in as a Student and taken to the course catalog.

**Why this priority**: nobody can enroll or teach without an account; every other story
depends on it.

**Independent Test**: register a new email through the sign-up screen and confirm the
user lands on the catalog, logged in, with the Student role.

**Acceptance Scenarios**:

1. **Given** a guest on the sign-up screen, **When** they submit a valid name, a new
   email, and a matching valid password, **Then** an account is created with the Student
   role, they are logged in, and they are redirected to the catalog.
2. **Given** an email that is already registered, **When** a guest submits it, **Then**
   the form shows "Email already registered" and no account is created.
3. **Given** a malformed email, **When** a guest submits the form, **Then** an email
   format error is shown and no account is created.
4. **Given** a password shorter than 8 characters, or with no letter, or with no number,
   **When** a guest submits the form, **Then** a password rule error is shown and no
   account is created.
5. **Given** a password and confirmation that differ, **When** a guest submits the form,
   **Then** a mismatch error is shown and no account is created.
6. **Given** any registered account, **When** stored account data is inspected, **Then**
   the password is not present in readable form.

---

### User Story 2 - Log in (US-02, Priority: P1)

A registered user logs in with email and password and lands on the home page for their
role. Repeated failed attempts temporarily block the email.

**Why this priority**: returning users must be able to reach their courses; role-based
landing is the entry point to every role's features.

**Independent Test**: log in once per role (Student, Instructor, Admin) and confirm each
lands on its home page; then fail five times and confirm the block.

**Acceptance Scenarios**:

1. **Given** a registered Student, **When** they log in with correct credentials,
   **Then** they land on My Learning.
2. **Given** a registered Instructor, **When** they log in with correct credentials,
   **Then** they land on My Courses.
3. **Given** a registered Admin, **When** they log in with correct credentials,
   **Then** they land on the Dashboard.
4. **Given** a wrong password or an unknown email, **When** a user tries to log in,
   **Then** the same message "Invalid email or password" is shown in both cases.
5. **Given** five failed login attempts for one email within 15 minutes, **When** a
   sixth attempt is made (even with the correct password), **Then** it is refused and
   the user is told to try again later.
6. **Given** a logged-in user, **When** they perform any action that needs an account,
   **Then** they are recognised without logging in again.
7. **Given** a Blocked account, **When** its owner logs in with the correct password,
   **Then** login is refused with "Account blocked".
8. **Given** a signed-in user whose account becomes Blocked, **When** their login next
   renews (within 15 minutes), **Then** renewal is refused and they are sent to the login
   screen.

---

### User Story 3 - Log out (US-03, Priority: P1)

A logged-in user logs out so nobody else can use their account on the device.

**Why this priority**: basic account safety on shared devices.

**Independent Test**: log in, log out, then try to open a protected page directly.

**Acceptance Scenarios**:

1. **Given** a logged-in user, **When** they choose Log out, **Then** their login is
   cleared on the device and they are taken to the home page.
2. **Given** a user who has just logged out, **When** they open a protected page
   directly, **Then** they are redirected to the login screen.

---

### User Story 4 - Role-based access (US-04, Priority: P1)

Every page and every server action checks the user's role, so students cannot perform
instructor or admin actions and guests cannot perform member actions.

**Why this priority**: without enforced roles every later feature is insecure.

**Independent Test**: as each role, try to open another role's page and call another
role's action directly; confirm each is refused with the right response.

**Acceptance Scenarios**:

1. **Given** a request with no login or an invalid/expired login, **When** it targets a
   protected action, **Then** it is refused as "not authenticated".
2. **Given** a logged-in Student, **When** they call an instructor-only or admin-only
   action directly, **Then** it is refused as "not permitted" and nothing changes.
3. **Given** a logged-in Student, **When** they open an instructor or admin page by URL,
   **Then** the page is not shown and they are redirected.
4. **Given** a logged-in user of any role, **When** they view the menu, **Then** it shows
   only items their role can use.

---

### User Story 5 - View and edit my profile (US-05, Priority: P2)

A logged-in user views and updates their name, photo and short bio. Email is visible but
not editable.

**Why this priority**: useful for identity (especially instructors) but not required to
learn or teach.

**Independent Test**: open the profile, change name, bio and photo, save, reload, and
confirm the changes persist.

**Acceptance Scenarios**:

1. **Given** a logged-in user on their profile, **When** they view it, **Then** name,
   email, photo and bio are shown, and email cannot be edited.
2. **Given** valid changes to name or bio, **When** they save, **Then** the changes are
   stored and a success message is shown.
3. **Given** a JPG or PNG photo of 2 MB or less, **When** they upload it and save,
   **Then** the new photo is shown on the profile.
4. **Given** a photo over 2 MB or in another format, **When** they try to upload it,
   **Then** an error explains the limits and the existing photo is kept.

---

### User Story 6 - Change password (US-06, Priority: P2)

A logged-in user changes their password by entering the current password and a new one.

**Why this priority**: good security hygiene, but users can function without it.

**Independent Test**: change the password, log out, and confirm only the new password
works.

**Acceptance Scenarios**:

1. **Given** the correct current password and a valid new password, **When** the user
   submits, **Then** the password is changed, a success message is shown, the current
   device stays signed in, and the user's other devices are signed out.
2. **Given** a wrong current password, **When** the user submits, **Then** an error is
   shown and the password is unchanged.
3. **Given** a new password that breaks the registration rules, **When** the user
   submits, **Then** a password rule error is shown and the password is unchanged.

---

### User Story 7 - Reset forgotten password (US-07, Priority: P3)

A registered user who forgot their password requests a reset link by email and uses it
once, within 1 hour, to set a new password.

**Why this priority**: valuable, but a forgotten password can be handled manually in
Phase 1 if needed; it also needs email delivery.

**Independent Test**: request a reset, open the emailed link, set a new password, log in
with it; then reopen the same link and confirm it shows "Link expired".

**Acceptance Scenarios**:

1. **Given** any email address, **When** a user submits "Forgot password", **Then** the
   same confirmation message is shown whether or not an account exists.
2. **Given** a registered email, **When** a reset is requested, **Then** a reset link is
   sent to that email.
3. **Given** a reset link less than 1 hour old and unused, **When** the user opens it and
   sets a valid new password, **Then** the password is changed, every device signed in to
   that account is signed out, and they can log in with the new password.
4. **Given** a reset link that has been used or is older than 1 hour, **When** the user
   opens it, **Then** "Link expired" is shown and no password change is possible.

---

### Edge Cases

- Registering with the same email in different letter case (e.g. `Ali@x.com` vs
  `ali@x.com`) is treated as a duplicate.
- Leading/trailing spaces in email are ignored; the password is used exactly as typed.
- A login made while the email is blocked does not extend or reset the block window.
- A successful login clears the failed-attempt count for that email.
- A login that expires while the user is active is renewed silently; the user notices
  nothing.
- When renewal is no longer possible (7 days passed, or logged out on this device), the
  user's next action sends them to the login screen, not to an error page.
- Several requests made at the moment of renewal are all completed without forcing a new
  sign-in.
- Requesting several reset links: only the most recent unused link is valid.
- A reset for an unknown email sends nothing and reveals nothing.
- Changing or resetting the password does not change the user's role or profile.

## Requirements *(mandatory)*

### Functional Requirements

**Registration**

- **FR-001**: System MUST let a guest register with full name, email, password and
  password confirmation.
- **FR-002**: System MUST reject an email that is malformed or already registered
  (case-insensitive), showing "Email already registered" for duplicates.
- **FR-003**: System MUST require passwords of at least 8 characters with at least one
  letter and one number, and a matching confirmation.
- **FR-004**: System MUST store passwords only in a one-way protected form; passwords
  MUST never be stored, shown, logged or returned in readable form.
- **FR-005**: System MUST give every new account the Student role.
- **FR-006**: System MUST log the user in and redirect to the catalog after successful
  registration.

**Login and logout**

- **FR-007**: System MUST let a registered user log in with email and password.
- **FR-008**: System MUST show the single generic message "Invalid email or password"
  for any failed login, without revealing which part was wrong.
- **FR-009**: System MUST redirect after login by role: Student → My Learning,
  Instructor → My Courses, Admin → Dashboard.
- **FR-010**: System MUST block login for an email after 5 failed attempts within 15
  minutes, for 15 minutes from the fifth failure.
- **FR-011**: System MUST keep a user logged in across pages until they log out or the
  login expires. Each login credential is valid for 15 minutes and MUST be renewed
  automatically, without user action, for up to 7 days from the last sign-in; after 7 days
  the user MUST sign in again.
- **FR-011a**: Each renewal MUST reflect the user's current role, so a role change takes
  effect within 15 minutes.
- **FR-011b**: Every account MUST have a status, Active or Blocked; new accounts are
  Active. Sign-in with the correct password for a Blocked account MUST be refused with
  "Account blocked"; a wrong password for a Blocked account MUST still show the generic
  message (FR-008).
- **FR-011c**: Renewal MUST be refused for a Blocked account, so a blocked user is signed
  out within 15 minutes.
- **FR-012**: System MUST let a logged-in user log out, clearing their login on the
  device, ending its ability to renew, and redirecting to the home page.

**Access control**

- **FR-013**: System MUST refuse every protected server action with "not authenticated"
  when the login is missing, invalid or expired.
- **FR-014**: System MUST refuse every role-restricted server action with "not permitted"
  when the user's role does not allow it.
- **FR-015**: System MUST prevent users from opening pages their role cannot use,
  redirecting guests to login and other roles to their home page.
- **FR-016**: System MUST show only the menu items the current role can use.

**Profile and password**

- **FR-017**: System MUST let a logged-in user view their name, email, photo and bio,
  and edit name, photo and bio; email MUST NOT be editable.
- **FR-018**: System MUST accept profile photos only in JPG or PNG format, 2 MB or less.
- **FR-019**: System MUST show a success message after saving profile changes.
- **FR-020**: System MUST let a logged-in user change their password only after entering
  the correct current password; the new password MUST meet FR-003.
- **FR-021**: System MUST leave the password unchanged and show an error when the current
  password is wrong.
- **FR-021a**: After a successful password change, System MUST end all of the user's other
  login sessions and keep the current device signed in.

**Password reset**

- **FR-022**: System MUST let a user request a password reset by email and MUST show the
  same response whether or not the email is registered.
- **FR-023**: System MUST email a reset link to registered addresses, valid for 1 hour
  and usable once.
- **FR-024**: System MUST show "Link expired" for a used or expired link and refuse the
  reset.
- **FR-025**: System MUST invalidate earlier unused reset links when a new one is issued.
- **FR-026**: After a successful password reset, System MUST end all of the user's login
  sessions on every device.

### Key Entities

- **User**: a person with an account. Full name, email (unique, not editable), protected
  password, role, status (Active or Blocked, default Active), optional photo, optional
  bio, created date.
- **Role**: one of Student, Instructor, Admin. Each user has exactly one role. Guest is
  the absence of a login, not a stored role.
- **Login attempt record**: failed login attempts per email with times, used to apply the
  5-in-15-minutes block.
- **Login session**: one per signed-in device; belongs to one user. Sign-in time, renewal
  expiry (sign-in + 7 days), ended/active state. Used to renew the 15-minute login and
  ended on logout.
- **Password reset request**: belongs to one user; issued time, expiry (issued + 1 hour),
  used/unused state.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new visitor can complete registration and reach the catalog in under 1
  minute.
- **SC-002**: A returning user can log in and reach their role's home page in under 15
  seconds.
- **SC-003**: 100% of attempts to use another role's pages or actions are refused in
  automated tests covering every protected action.
- **SC-004**: No stored password can be read back in plain form, verified by inspecting
  stored account data.
- **SC-005**: Failed-login and forgot-password responses are identical for existing and
  non-existing emails, verified by comparing responses.
- **SC-006**: Every acceptance scenario in this spec is covered by at least one passing
  automated test.
- **SC-007**: A reset email arrives within 2 minutes of the request under normal
  conditions.

## Assumptions

- Scope: all seven EP-01 stories (US-01 → US-07) are built in this feature, in the order
  above. This moves US-05, US-06 and US-07 earlier than the Sprint 7 "Polish" slot in the
  source build order.
- Blocking and unblocking users is done by an admin in EP-05 (US-25). In this feature,
  Blocked accounts exist only through seed or test data.
- A blocked user asking for a password reset gets the same generic response; a reset does
  not unblock the account.
- Admin and Instructor accounts cannot self-register. Role changes are done by an admin
  in EP-05 (Admin basics). For development and testing, seed Admin and Instructor
  accounts are provided.
- The role home pages (My Learning, My Courses, Dashboard) and the catalog are built in
  later epics. In this feature they exist as minimal placeholder pages so redirects can
  be tested.
- There is no "remember me" option; every sign-in gets the same 15-minute login renewed
  for up to 7 days (see FR-011).
- Logging out affects only the current device; logins on other devices stay valid until
  they expire or stop renewing.
- Resetting the password does not log the user in automatically; they log in with the new
  password (see FR-021a and FR-026 for effects on other sessions).
- Ending a session stops its renewal immediately; a 15-minute login already issued on that
  device may stay usable until it expires.
- Field limits: full name 2–100 characters; bio up to 500 characters.
- Email verification on sign-up is out of scope for Phase 1.
- An email-sending service is available for password reset. In development, sent emails
  can be captured locally instead of delivered.
- Profile photos are removable by uploading a new one. Deleting a photo without replacing
  it is out of scope.
