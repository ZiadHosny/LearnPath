import { HttpErrorResponse } from '@angular/common/http';
import type { I18nService } from '../i18n/i18n.service';

// Error codes the web app has its own text for (core/i18n/locales/*.ts → errors.<CODE>).
const KNOWN_CODES = new Set([
  'EMAIL_TAKEN',
  'INVALID_CREDENTIALS',
  'ACCOUNT_BLOCKED',
  'LINK_EXPIRED',
  'INVALID_CURRENT_PASSWORD',
  'FILE_TOO_LARGE',
  'UNSUPPORTED_FILE_TYPE',
]);

export function errorCode(error: unknown): string | null {
  if (error instanceof HttpErrorResponse) return error.error?.error?.code ?? null;
  return null;
}

// A message for an API error in the current language. Unknown codes use the API's own message,
// which the API already sends in the requested language (Accept-Language).
export function messageFor(error: unknown, i18n: I18nService): string {
  if (!(error instanceof HttpErrorResponse)) return i18n.t('errors.generic');
  if (error.status === 0) return i18n.t('errors.offline');

  const code = errorCode(error);
  if (code === 'TOO_MANY_ATTEMPTS') {
    const seconds = Number(error.headers.get('Retry-After') ?? 900);
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return minutes === 1
      ? i18n.t('errors.TOO_MANY_ATTEMPTS_ONE')
      : i18n.t('errors.TOO_MANY_ATTEMPTS', { minutes: i18n.number(minutes) });
  }
  if (code && KNOWN_CODES.has(code)) return i18n.t(`errors.${code}`);
  return error.error?.error?.message ?? i18n.t('errors.generic');
}

// Field errors from a 400 VALIDATION_ERROR, already in the requested language.
export function errorDetails(error: unknown): { field: string; message: string }[] {
  if (!(error instanceof HttpErrorResponse)) return [];
  const details = error.error?.error?.details;
  return Array.isArray(details) ? details : [];
}
