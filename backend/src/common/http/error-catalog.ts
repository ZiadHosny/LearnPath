// ─── Every API error, defined once ─────────────────────────────────────────────────────────
// Change a status or a default message here and every endpoint follows. Codes are part of the
// API contract (the web app maps them to texts), so renaming a code is a breaking change.

export const ERROR_CATALOG = {
  VALIDATION_ERROR: { status: 400, message: 'Some fields are invalid' },
  INVALID_CURRENT_PASSWORD: { status: 400, message: 'Current password is incorrect' },
  UNAUTHENTICATED: { status: 401, message: 'Please log in' },
  INVALID_CREDENTIALS: { status: 401, message: 'Invalid email or password' },
  SESSION_EXPIRED: { status: 401, message: 'Your session has expired, please log in again' },
  FORBIDDEN: { status: 403, message: 'You do not have permission to do this' },
  ACCOUNT_BLOCKED: { status: 403, message: 'Account blocked' },
  NOT_FOUND: { status: 404, message: 'Not found' },
  EMAIL_TAKEN: { status: 409, message: 'Email already registered' },
  LINK_EXPIRED: { status: 410, message: 'Link expired' },
  FILE_TOO_LARGE: { status: 413, message: 'Photo must be 2 MB or smaller' },
  UNSUPPORTED_FILE_TYPE: { status: 415, message: 'Photo must be a JPG or PNG image' },
  TOO_MANY_ATTEMPTS: { status: 429, message: 'Too many failed attempts. Try again later.' },
  INTERNAL: { status: 500, message: 'Something went wrong' },
} as const satisfies Record<string, { status: number; message: string }>;

export type ErrorCode = keyof typeof ERROR_CATALOG;
