# Implementation Plan: English and Arabic, open to more languages

**Branch**: `006-i18n-en-ar` | **Date**: 2026-10-08 | **Spec**: [spec.md](spec.md)

## Summary

Translation files are TypeScript objects: `en.ts` is the source and defines the type every other
language must satisfy, so a missing key fails the type check (US-31). The API resolves the
language from `Accept-Language`, translates error and validation messages in the exception
filter, and sets `Content-Language`. The web app gets a signal-based `I18nService`, a `t` pipe,
a language switch, RTL via `dir`, translated page titles, and an interceptor that sends
`Accept-Language`. Users gain an optional `language` column.

## Technical Context

**Dependencies**: none new (`@angular/cdk/bidi` already installed with Material; `Intl` for numbers)
**Storage**: migration `add_user_language` (`users.language varchar(10) null`)
**Testing**: backend Vitest (unit + integration), frontend Angular Vitest

## Constitution Check

| Principle | Status |
|---|---|
| I. Vertical slice | ✅ API + screens + tests in one story |
| II. Tests | ✅ every acceptance scenario mapped (tasks) |
| III. Server validation | ✅ `language` validated against the list |
| V. Phase scope | ✅ moved into Phase 1 by the product owner (stories file updated) |

## Design

### Backend (`backend/src/i18n/`)

| File | Purpose |
|---|---|
| `languages.ts` | `LANGUAGES` list (`code`, `name`, `dir`, `locale`), `DEFAULT_LANGUAGE = 'en'` |
| `locales/en.ts` | source texts: `errors.<CODE>`, `validation.<key>`, `messages.<key>`; exports `Translation` type |
| `locales/ar.ts` | `export const ar: Translation` |
| `translate.ts` | `t(lang, key, params?)` with English fallback; `resolveLanguage(acceptLanguage)` |
| `language.middleware.ts` | sets `req.language`, `Content-Language` |

- Error messages: `ERROR_CATALOG` keeps statuses; English messages come from `en.errors`.
  `AppError` keeps an optional `messageKey`; the filter translates message and detail keys.
- DTO validation messages become keys (`validation.fullNameLength`); the pipe maps unknown
  fields to `validation.unknownField` and other default messages to `validation.invalidValue`.
- `UserDto.language`, `UpdateProfileDto.language` (`@IsIn(LANGUAGE_CODES)`, nullable).

### Frontend (`frontend/src/app/core/i18n/`)

| File | Purpose |
|---|---|
| `languages.ts` | same list + `load()` per language (dynamic import) |
| `locales/en.ts`, `locales/ar.ts` | texts; `ar: Translation` |
| `i18n.service.ts` | signals `language`, `dir`; `use(code)`, `t(key, params)`, `number(n)`; sets `<html lang dir>`; localStorage |
| `translate.pipe.ts` | `{{ 'auth.login.title' \| t }}` |
| `language.interceptor.ts` | `Accept-Language` on `/api` calls |
| `i18n-title.strategy.ts` | route titles are keys |
| `language-switch.component.ts` | menu in the header; saves to the account when signed in |

`AuthService.setSession` applies `user.language` when set. `messageFor(error, i18n)` maps codes
to `errors.<CODE>`.
