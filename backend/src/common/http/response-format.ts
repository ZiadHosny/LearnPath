import { DEFAULT_LANGUAGE, type LanguageCode } from '../../i18n/languages.js';
import { t } from '../../i18n/translate.js';
import type { AppError } from './app-error.js';

// ─── The shape of every API response, decided here ──────────────────────────────────────────
// Success bodies go through toSuccessBody (global ResponseInterceptor), error bodies through
// toErrorBody (global AllExceptionsFilter). Edit these two functions to change the format.
//
// envelope: false → success body is the data itself (the current contract the web app uses).
// envelope: true  → success body is { "data": … }. This is a breaking change for the web app.

export const RESPONSE_FORMAT = {
  envelope: false,
};

// For tests (and a future setting): change the format at run time.
export function configureResponseFormat(options: Partial<typeof RESPONSE_FORMAT>): void {
  Object.assign(RESPONSE_FORMAT, options);
}

export interface ErrorBody {
  error: { code: string; message: string; details?: Array<{ field: string; message: string }> };
}

// Texts are translated into the request's language (EP-06); codes never change.
export function toErrorBody(error: AppError, lang: LanguageCode = DEFAULT_LANGUAGE): ErrorBody {
  const message = error.fixedMessage ?? t(lang, error.messageKey ?? `errors.${error.code}`, error.params);
  const details = error.details?.map((detail) => ({
    field: detail.field,
    message: t(lang, detail.message, { field: detail.field }),
  }));
  return {
    error: {
      code: error.code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

// undefined means "no body" (e.g. 204) and is never wrapped.
export function toSuccessBody<T>(data: T): T | { data: T } | undefined {
  if (data === undefined) return undefined;
  return RESPONSE_FORMAT.envelope ? { data } : data;
}
