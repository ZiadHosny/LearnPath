import { t } from '../../i18n/translate.js';
import { ERROR_CATALOG, type ErrorCode } from './error-catalog.js';

export type { ErrorCode } from './error-catalog.js';

// `message` in a detail may be a translation key (e.g. 'validation.passwordsMismatch'); it is
// translated into the request's language when the response is built.
export interface ErrorDetail {
  field: string;
  message: string;
}

export interface AppErrorOptions {
  messageKey?: string; // a translation key that replaces errors.<CODE> for this one error
  message?: string; // a fixed text (not translated); prefer messageKey
  details?: ErrorDetail[];
  status?: number; // only for errors whose status depends on the cause (e.g. body parser 413)
  params?: Record<string, string>; // fills {{name}} in the text, e.g. { count: '3' }
}

// An API error. Status from ERROR_CATALOG; text from the translation files.
// `message` is the English text (for logs); responses are translated per request.
export class AppError extends Error {
  readonly status: number;
  readonly details?: ErrorDetail[];
  readonly messageKey?: string;
  readonly fixedMessage?: string;
  readonly params?: Record<string, string>;

  constructor(
    public readonly code: ErrorCode,
    options: AppErrorOptions = {},
  ) {
    super(options.message ?? t('en', options.messageKey ?? `errors.${code}`, options.params));
    this.name = 'AppError';
    this.status = options.status ?? ERROR_CATALOG[code].status;
    this.details = options.details;
    this.messageKey = options.messageKey;
    this.fixedMessage = options.message;
    this.params = options.params;
  }
}

// Carries how long the login block lasts; the error layer turns it into a Retry-After header.
export class TooManyAttemptsError extends AppError {
  constructor(public readonly retryAfterSeconds: number) {
    super('TOO_MANY_ATTEMPTS');
  }
}

// Shortcuts used across the code base.
export const Errors = {
  unauthenticated: () => new AppError('UNAUTHENTICATED'),
  forbidden: () => new AppError('FORBIDDEN'),
  invalidCredentials: () => new AppError('INVALID_CREDENTIALS'),
  sessionExpired: () => new AppError('SESSION_EXPIRED'),
  accountBlocked: () => new AppError('ACCOUNT_BLOCKED'),
  emailTaken: () => new AppError('EMAIL_TAKEN'),
  linkExpired: () => new AppError('LINK_EXPIRED'),
  invalidCurrentPassword: () => new AppError('INVALID_CURRENT_PASSWORD'),
  fileTooLarge: () => new AppError('FILE_TOO_LARGE'),
  unsupportedFileType: () => new AppError('UNSUPPORTED_FILE_TYPE'),
  notFound: () => new AppError('NOT_FOUND'),
  cannotChangeOwnRole: () => new AppError('CANNOT_CHANGE_OWN_ROLE'),
  categoryExists: () => new AppError('CATEGORY_EXISTS'),
  categoryInUse: (count: number) =>
    new AppError('CATEGORY_IN_USE', {
      messageKey: count === 1 ? 'messages.categoryInUseOne' : undefined,
      params: { count: String(count) },
    }),
  internal: () => new AppError('INTERNAL'),
};
