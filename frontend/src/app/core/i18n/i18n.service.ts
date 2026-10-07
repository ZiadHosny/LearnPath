import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { DEFAULT_LANGUAGE, LANGUAGES, findLanguage, type Language } from './languages';
import { en, type Translation } from './locales/en';

const STORAGE_KEY = 'lp_language';

function lookup(messages: Translation, key: string): string | undefined {
  let node: unknown = messages;
  for (const part of key.split('.')) {
    if (typeof node !== 'object' || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }
  return typeof node === 'string' ? node : undefined;
}

function readStoredLanguage(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // private mode or blocked storage
  }
}

// The app's language: texts, direction, number formatting. English is loaded up front; other
// languages load when chosen. Templates use the `t` pipe; code uses t().
@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly document = inject(DOCUMENT);
  private readonly messages = signal<Translation>(en);
  private readonly current = signal<Language>(findLanguage(DEFAULT_LANGUAGE)!);

  readonly languages = LANGUAGES;
  readonly language = computed(() => this.current().code);
  readonly dir = computed(() => this.current().dir);

  // Restores the language saved in this browser (if any).
  async restore(): Promise<void> {
    const saved = readStoredLanguage();
    if (saved && saved !== this.language()) await this.use(saved);
    else this.applyToDocument();
  }

  async use(code: string): Promise<void> {
    const language = findLanguage(code);
    if (!language) return;
    const messages = await language.load();
    this.messages.set(messages);
    this.current.set(language);
    this.applyToDocument();
    try {
      localStorage.setItem(STORAGE_KEY, language.code);
    } catch {
      // storage unavailable: the choice lasts for this visit only
    }
  }

  // Text for a key; English if the current language lacks it; the key itself if nobody has it.
  t(key: string, params: Record<string, string | number> = {}): string {
    const text = lookup(this.messages(), key) ?? lookup(en, key) ?? key;
    return text.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
      name in params ? String(params[name]) : match,
    );
  }

  number(value: number): string {
    return new Intl.NumberFormat(this.current().locale).format(value);
  }

  private applyToDocument(): void {
    const root = this.document.documentElement;
    root.lang = this.current().code;
    root.dir = this.current().dir;
  }
}
