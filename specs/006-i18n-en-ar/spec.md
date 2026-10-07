# Feature Specification: English and Arabic, open to more languages

**Feature Branch**: `006-i18n-en-ar`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "a story to support languages: English is the base, plus Arabic, and customizable so more can be added" (EP-06: US-30, US-31 in course-school-user-stories.md; moved into Phase 1 on 2026-10-08)

## Clarifications

### Session 2026-10-08

- Q: Build languages now or in Phase 2? → A: Now, in Phase 1, before EP-02.
- Q: Where is the language choice remembered? → A: In the browser for everyone, and on the
  account for signed-in users (new optional `language` on the user; the user object returned by
  the API gains a `language` field — an intentional, additive contract change).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Use LearnPath in English or Arabic (US-30, Priority: P1)

A visitor or user switches between English and Arabic from any screen. Arabic reads right to
left. Every text, validation message and error appears in the chosen language. The choice is
remembered.

**Independent Test**: switch to Arabic on the login screen, submit wrong data, see Arabic texts
and errors right-to-left; reload; still Arabic.

**Acceptance Scenarios**:

1. **Given** a first visit, **When** the app opens, **Then** it is in English, left-to-right.
2. **Given** any screen, **When** the user picks Arabic in the language switch, **Then** all
   texts change to Arabic and the layout becomes right-to-left without reloading.
3. **Given** Arabic was chosen, **When** the app is reloaded, **Then** it opens in Arabic.
4. **Given** a signed-in user who chose Arabic, **When** they sign in on another browser,
   **Then** the app switches to Arabic.
5. **Given** Arabic, **When** a form has errors or the API refuses a request, **Then** the
   messages are in Arabic.
6. **Given** a text missing from the Arabic translation, **When** it is shown, **Then** the
   English text appears (never a raw key).
7. **Given** Arabic, **When** a number is shown (e.g. the bio character counter), **Then** it is
   formatted for that language.
8. **Given** an API request with `Accept-Language: ar`, **When** it fails, **Then** the error
   message and validation details are in Arabic, the error code is unchanged, and the response
   says `Content-Language: ar`; without a supported language the answer is English.

### User Story 2 - Add a language without code changes (US-31, Priority: P2)

A developer adds a language by adding its translation file (one for the web app, one for the
API) and one line in each language list.

**Independent Test**: add a test language in a test; it appears in the switch and is served.

**Acceptance Scenarios**:

1. **Given** the language list, **When** a language is added to it with its file, **Then** the
   switch shows it and the API accepts it, with no other code change.
2. **Given** a translation file missing keys that English has, **When** the project is type
   checked or built, **Then** it fails and names the missing keys.
3. **Given** an account language that is not in the list, **When** a user tries to save it,
   **Then** it is refused with a validation error.

## Requirements *(mandatory)*

- **FR-001**: English MUST be the default and fallback language; Arabic MUST be available.
- **FR-002**: Languages MUST be declared in one list per app (code, native name, direction,
  locale for formatting); the web app's switch and the API MUST read that list.
- **FR-003**: Every user-visible text in the web app (screens, titles, menus, validation and
  error messages) MUST come from translation files.
- **FR-004**: Every API error message and validation detail MUST come from translation files and
  follow `Accept-Language` (q-values honoured; default English); responses MUST include
  `Content-Language`; error codes MUST NOT change with the language.
- **FR-005**: Right-to-left languages MUST switch the whole layout direction.
- **FR-006**: The choice MUST be stored in the browser and, when signed in, on the account
  (`PATCH /api/users/me { language }`, only listed codes accepted); the account choice wins at
  sign-in.
- **FR-007**: A missing translation MUST fall back to English; a translation file missing keys
  MUST fail the type check / build.
- **FR-008**: Numbers shown to users MUST be formatted with the language's locale.
- **FR-009**: Logs stay in English (they are for developers).
- **FR-010**: With English selected, every text MUST be the same as before this feature
  (existing tests keep passing, apart from the intentional `language` field in the user object).

### Key Entities

- **User**: gains optional `language` (a listed language code, or empty = not chosen).

## Success Criteria *(mandatory)*

- **SC-001**: 0 hard-coded user-visible English strings left in web app templates and components.
- **SC-002**: 100% of API error codes and validation messages have an Arabic text.
- **SC-003**: Switching language changes the screen in under 1 second, with no reload.
- **SC-004**: All existing tests pass in English; new tests cover Arabic, RTL, fallback and the
  language list.

## Assumptions

- Arabic number formatting uses Western digits (`ar-EG` with `latn` numbering) to keep emails,
  codes and counters easy to read; this is set in the language list and can be changed.
- Translations are written by the team for now; professional review can follow.
- Course content (titles, lessons) is not translated: it is in the language the instructor wrote.
