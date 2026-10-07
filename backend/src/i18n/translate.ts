import { DEFAULT_LANGUAGE, LANGUAGES, LANGUAGE_CODES, type LanguageCode } from './languages.js';
import type { Translation } from './locales/en.js';

export const TRANSLATIONS = Object.fromEntries(LANGUAGES.map((l) => [l.code, l.messages])) as Record<
  LanguageCode,
  Translation
>;

function lookup(messages: Translation | undefined, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

// Text for a key in a language; falls back to English, then to the key itself (so a plain
// sentence passed as a "key" comes back unchanged). {{name}} placeholders are filled from params.
export function t(lang: LanguageCode, key: string, params: Record<string, string> = {}): string {
  const text = lookup(TRANSLATIONS[lang], key) ?? lookup(TRANSLATIONS[DEFAULT_LANGUAGE], key) ?? key;
  return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) => params[name] ?? match);
}

export function isTranslationKey(value: string): boolean {
  return lookup(TRANSLATIONS[DEFAULT_LANGUAGE], value) !== undefined;
}

// Picks the best listed language from an Accept-Language header (q-values honoured).
export function resolveLanguage(header: string | undefined): LanguageCode {
  if (!header) return DEFAULT_LANGUAGE;
  const ranked = header
    .split(',')
    .map((part, index) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
      return { base: tag.trim().toLowerCase().split('-')[0], q: q ? Number(q.slice(2)) : 1, index };
    })
    .filter((item) => item.base && !Number.isNaN(item.q) && item.q > 0)
    .sort((a, b) => b.q - a.q || a.index - b.index);
  const match = ranked.find((item) => (LANGUAGE_CODES as readonly string[]).includes(item.base));
  return (match?.base as LanguageCode | undefined) ?? DEFAULT_LANGUAGE;
}
