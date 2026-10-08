import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { I18nService } from './i18n.service';
import { LANGUAGES } from './languages';
import { en } from './locales/en';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' ? keys(v as object, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('I18nService', () => {
  let i18n: I18nService;
  let doc: Document;

  beforeEach(() => {
    localStorage.removeItem('lp_language');
    TestBed.configureTestingModule({});
    i18n = TestBed.inject(I18nService);
    doc = TestBed.inject(DOCUMENT);
  });

  afterEach(() => localStorage.removeItem('lp_language'));

  it('US-30 S1: starts in English, left to right', () => {
    expect(i18n.language()).toBe('en');
    expect(i18n.dir()).toBe('ltr');
    expect(i18n.t('nav.login')).toBe('Log in');
  });

  it('US-30 S2: switching to Arabic changes texts and direction, and sets <html lang dir>', async () => {
    await i18n.use('ar');
    expect(i18n.language()).toBe('ar');
    expect(i18n.dir()).toBe('rtl');
    expect(i18n.t('nav.login')).not.toBe('Log in');
    expect(doc.documentElement.lang).toBe('ar');
    expect(doc.documentElement.dir).toBe('rtl');
  });

  it('US-30 S3: remembers the choice and restores it', async () => {
    await i18n.use('ar');
    expect(localStorage.getItem('lp_language')).toBe('ar');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    const fresh = TestBed.inject(I18nService);
    await fresh.restore();
    expect(fresh.language()).toBe('ar');
  });

  it('ignores an unknown language', async () => {
    await i18n.use('xx');
    expect(i18n.language()).toBe('en');
  });

  it('US-30 S6: falls back to English for a text the language lacks; unknown keys stay as they are', async () => {
    await i18n.use('ar');
    // Simulate a gap in the Arabic file: the English text is shown, not the key.
    const messages = (i18n as unknown as { messages: { set(v: unknown): void; (): Record<string, Record<string, string>> } }).messages;
    messages.set({ ...messages(), nav: { ...messages()['nav'], login: undefined } });
    expect(i18n.t('nav.login')).toBe('Log in');
    expect(i18n.t('no.such.key')).toBe('no.such.key');
  });

  it('fills {{params}}', () => {
    expect(i18n.t('errors.TOO_MANY_ATTEMPTS', { minutes: '10' })).toBe(
      'Too many failed attempts. Try again in 10 minutes.',
    );
  });

  it('US-30 S7: formats numbers with the language locale', async () => {
    expect(i18n.number(1234)).toBe('1,234');
    await i18n.use('ar');
    expect(i18n.number(1234)).toBe(new Intl.NumberFormat('ar-EG-u-nu-latn').format(1234));
  });

  it('US-30 S7: formats dates with the language locale', async () => {
    const day = '2026-10-08T12:00:00.000Z';
    expect(i18n.date(day)).toBe('Oct 8, 2026');
    await i18n.use('ar');
    expect(i18n.date(day)).toBe(
      new Intl.DateTimeFormat('ar-EG-u-nu-latn', { dateStyle: 'medium' }).format(new Date(day)),
    );
  });

  it('US-31: every listed language has every English key', async () => {
    const english = keys(en).sort();
    for (const language of LANGUAGES) {
      expect(keys(await language.load()).sort()).toEqual(english);
    }
  });
});
