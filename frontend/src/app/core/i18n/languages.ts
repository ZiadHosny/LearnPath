import { en, type Translation } from './locales/en';

// ─── Languages the web app offers ───────────────────────────────────────────────────────────
// To add a language: create locales/<code>.ts (typed `Translation`) and add one line here.
// The language switch reads this list. Keep it in step with backend/src/i18n/languages.ts.

export interface Language {
  code: string;
  name: string; // shown in the switch, in the language itself
  dir: 'ltr' | 'rtl';
  locale: string; // for numbers and dates (Intl); '-u-nu-latn' keeps Western digits
  load: () => Promise<Translation>; // other languages load only when chosen
}

export const LANGUAGES: readonly Language[] = [
  { code: 'en', name: 'English', dir: 'ltr', locale: 'en-US', load: () => Promise.resolve(en) },
  {
    code: 'ar',
    name: 'العربية',
    dir: 'rtl',
    locale: 'ar-EG-u-nu-latn',
    load: () => import('./locales/ar').then((m) => m.ar),
  },
];

export const DEFAULT_LANGUAGE = 'en';

export function findLanguage(code: string | null | undefined): Language | undefined {
  return LANGUAGES.find((language) => language.code === code);
}
