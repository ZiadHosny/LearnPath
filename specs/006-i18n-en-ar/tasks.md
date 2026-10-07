---

description: "Task list for 006-i18n-en-ar (EP-06: US-30, US-31)"
---

# Tasks: English and Arabic, open to more languages

**Input**: [spec.md](spec.md), [plan.md](plan.md) · **Tests**: REQUIRED, written first per part.

## Phase 1: API (US-30 S8, US-31 S1/S3)

- [X] T001 [P] [US1] Write `backend/tests/unit/i18n.test.ts`: `resolveLanguage` (missing → en, `ar` → ar, `fr;q=1, ar;q=0.8` → ar, `AR-eg` → ar, unknown → en); `t` falls back to English then to the key; params interpolate; every `ERROR_CATALOG` code has `errors.<CODE>` in every language
- [X] T002 [P] [US1] Write `backend/tests/integration/i18n.test.ts`: `Accept-Language: ar` → Arabic error message, same code, `Content-Language: ar`; Arabic validation details for register; English when absent; reset-request message translated; `PATCH /api/users/me { language: 'ar' }` saved and returned on login; `{ language: 'xx' }` → 400; `{ language: null }` clears it
- [X] T003 [US1] Create `backend/src/i18n/` (`languages.ts`, `locales/en.ts`, `locales/ar.ts`, `translate.ts`, `language.middleware.ts`); register middleware in `app.setup.ts`
- [X] T004 [US1] Error texts from translations: `ERROR_CATALOG` statuses only + `errorMessage(code)` from `en`; `AppError.messageKey`; filter translates message and details by `req.language`; `toErrorBody(error, translate)`; update unit tests for the catalog
- [X] T005 [US1] DTO messages → keys in all DTOs and `PasswordRule`; pipe maps whitelist/default messages to keys; reset-request message → `messages.resetLinkSent`; photo/JSON messages → keys
- [X] T006 [US1] Migration `add_user_language` (`language String? @db.VarChar(10)`); `UserDto.language`; `UpdateProfileDto.language` (`@IsOptional() @IsIn(LANGUAGE_CODES)` nullable); Swagger property; update `us01-register.test.ts` expected user object with `language: null` (intentional contract change, FR-006) and 001 `auth-api.md` note

## Phase 2: Web app (US-30 S1–S7, US-31 S1/S2)

- [X] T007 [P] [US1] Write `frontend/src/app/core/i18n/i18n.service.spec.ts`: default en/ltr; `use('ar')` loads Arabic, sets signals, `<html lang="ar" dir="rtl">`, localStorage; restore from localStorage; missing key → English; params; `number()` uses the locale; every language has every English key (runtime check)
- [X] T008 [P] [US1] Write `frontend/src/app/core/i18n/language.interceptor.spec.ts` (`Accept-Language` on `/api` only) and `frontend/src/app/layout/header/language-switch.component.spec.ts` (lists languages from the list; choosing one calls `use`; when signed in also `PATCH /api/users/me { language }`)
- [X] T009 [US1] Create `frontend/src/app/core/i18n/` (`languages.ts`, `locales/en.ts`, `locales/ar.ts`, `i18n.service.ts`, `translate.pipe.ts`, `language.interceptor.ts`, `i18n-title.strategy.ts`); provide in `app.config.ts`; `[dir]` on the app root
- [X] T010 [US1] Replace every user-visible string in `features/**`, `layout/**`, `app.routes.ts` titles, `core/forms/validators.ts`, `core/api/api-error.ts` with keys; `messageFor(error, i18n)`; bio counter via `i18n.number`
- [X] T011 [US1] Language switch in the header; `AuthService` applies `user.language` on sign-in; `User.language` in models
- [X] T012 [US1] Run frontend tests (English texts unchanged), lint, build

## Phase 3: Polish

- [X] T013 Full backend suite, lint, build; manual check: Arabic RTL on login/register/profile; README "Languages" section (how to add a language); stories file EP-06 done
