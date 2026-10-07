import { en } from '../../i18n/locales/en.js';

// ─── Every API error code, defined once ────────────────────────────────────────────────────
// The HTTP status lives here; the message text lives in the translation files
// (src/i18n/locales/<lang>.ts → errors.<CODE>). Codes are part of the API contract (the web app
// maps them to texts), so renaming a code is a breaking change.

export const ERROR_CATALOG = {
  VALIDATION_ERROR: { status: 400 },
  INVALID_CURRENT_PASSWORD: { status: 400 },
  UNAUTHENTICATED: { status: 401 },
  INVALID_CREDENTIALS: { status: 401 },
  SESSION_EXPIRED: { status: 401 },
  FORBIDDEN: { status: 403 },
  ACCOUNT_BLOCKED: { status: 403 },
  NOT_FOUND: { status: 404 },
  EMAIL_TAKEN: { status: 409 },
  LINK_EXPIRED: { status: 410 },
  FILE_TOO_LARGE: { status: 413 },
  UNSUPPORTED_FILE_TYPE: { status: 415 },
  TOO_MANY_ATTEMPTS: { status: 429 },
  INTERNAL: { status: 500 },
} as const satisfies Record<keyof typeof en.errors, { status: number }>;

export type ErrorCode = keyof typeof ERROR_CATALOG;

// English text of an error code (used for logs and as the default message).
export function errorMessage(code: ErrorCode): string {
  return en.errors[code];
}
