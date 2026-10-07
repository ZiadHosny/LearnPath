import { ERROR_CATALOG, type ErrorCode } from '../../src/common/http/error-catalog.js';
import { LANGUAGES } from '../../src/i18n/languages.js';
import { en } from '../../src/i18n/locales/en.js';
import { TRANSLATIONS, resolveLanguage, t } from '../../src/i18n/translate.js';

describe('US-30 API language resolution', () => {
  it.each([
    [undefined, 'en'],
    ['', 'en'],
    ['ar', 'ar'],
    ['AR-eg', 'ar'],
    ['en-GB,en;q=0.9', 'en'],
    ['fr;q=1, ar;q=0.8', 'ar'],
    ['ar;q=0.2, en;q=0.9', 'en'],
    ['de, fr', 'en'],
    ['*', 'en'],
  ])('Accept-Language %j → %s', (header, expected) => {
    expect(resolveLanguage(header)).toBe(expected);
  });
});

describe('US-30 translate', () => {
  it('returns the text in the requested language', () => {
    expect(t('en', 'errors.EMAIL_TAKEN')).toBe('Email already registered');
    expect(t('ar', 'errors.EMAIL_TAKEN')).not.toBe('Email already registered');
  });

  it('falls back to English, then to the key itself', () => {
    expect(t('xx' as never, 'errors.EMAIL_TAKEN')).toBe('Email already registered');
    expect(t('ar', 'no.such.key')).toBe('no.such.key');
  });

  it('fills {{params}}', () => {
    expect(t('en', 'validation.unknownField', { field: 'email' })).toContain('email');
  });
});

describe('US-31 every language is complete', () => {
  it('has a translation file for every listed language', () => {
    for (const { code } of LANGUAGES) expect(TRANSLATIONS[code]).toBeDefined();
  });

  it.each(Object.keys(ERROR_CATALOG) as ErrorCode[])('every language has a text for %s', (code) => {
    for (const { code: lang } of LANGUAGES) {
      expect(TRANSLATIONS[lang].errors[code]).toEqual(expect.any(String));
    }
  });

  it('every language has every English key', () => {
    const keys = (obj: object, prefix = ''): string[] =>
      Object.entries(obj).flatMap(([k, v]) => (typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
    const english = keys(en).sort();
    for (const { code } of LANGUAGES) expect(keys(TRANSLATIONS[code]).sort()).toEqual(english);
  });
});
