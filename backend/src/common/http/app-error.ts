import { ERROR_CATALOG, type ErrorCode } from './error-catalog.js';

export type { ErrorCode } from './error-catalog.js';

export interface ErrorDetail {
  field: string;
  message: string;
}

export interface AppErrorOptions {
  message?: string; // overrides the catalog message for this one error
  details?: ErrorDetail[];
  status?: number; // only for errors whose status depends on the cause (e.g. body parser 413)
}

// An API error. Status and default message come from ERROR_CATALOG.
export class AppError extends Error {
  readonly status: number;
  readonly details?: ErrorDetail[];

  constructor(
    public readonly code: ErrorCode,
    options: AppErrorOptions = {},
  ) {
    super(options.message ?? ERROR_CATALOG[code].message);
    this.name = 'AppError';
    this.status = options.status ?? ERROR_CATALOG[code].status;
    this.details = options.details;
  }
}

// Carries how long the login block lasts; the error layer turns it into a Retry-After header.
export class TooManyAttemptsError extends AppError {
  constructor(public readonly retryAfterSeconds: number) {
    super('TOO_MANY_ATTEMPTS');
  }
}

// Shortcuts used across the code base; all of them read the catalog.
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
  internal: () => new AppError('INTERNAL'),
};
