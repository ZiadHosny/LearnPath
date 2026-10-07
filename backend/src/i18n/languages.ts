import { ar } from './locales/ar.js';
import { en, type Translation } from './locales/en.js';

// ─── Languages the API speaks ───────────────────────────────────────────────────────────────
// To add a language: create locales/<code>.ts (typed `Translation`) and add one line here.
// Keep this list in step with frontend/src/app/core/i18n/languages.ts.

export interface Language {
  code: string;
  name: string; // in the language itself
  dir: 'ltr' | 'rtl';
  messages: Translation;
}

export const LANGUAGES = [
  { code: 'en', name: 'English', dir: 'ltr', messages: en },
  { code: 'ar', name: 'العربية', dir: 'rtl', messages: ar },
] as const satisfies readonly Language[];

export type LanguageCode = (typeof LANGUAGES)[number]['code'];
export const DEFAULT_LANGUAGE: LanguageCode = 'en';
export const LANGUAGE_CODES: readonly LanguageCode[] = LANGUAGES.map((l) => l.code);
