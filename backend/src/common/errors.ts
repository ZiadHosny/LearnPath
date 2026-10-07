export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'INVALID_CURRENT_PASSWORD'
  | 'UNAUTHENTICATED'
  | 'INVALID_CREDENTIALS'
  | 'SESSION_EXPIRED'
  | 'FORBIDDEN'
  | 'ACCOUNT_BLOCKED'
  | 'EMAIL_TAKEN'
  | 'LINK_EXPIRED'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'TOO_MANY_ATTEMPTS'
  | 'NOT_FOUND'
  | 'INTERNAL';

export interface ErrorDetail {
  field: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
  ) {
    super(message);
    this.name = 'AppError';
  }
}

// Carries how long the login block lasts; the error layer turns it into a Retry-After header.
export class TooManyAttemptsError extends AppError {
  constructor(public readonly retryAfterSeconds: number) {
    super(429, 'TOO_MANY_ATTEMPTS', 'Too many failed attempts. Try again later.');
  }
}

export const Errors = {
  unauthenticated: () => new AppError(401, 'UNAUTHENTICATED', 'Please log in'),
  forbidden: () => new AppError(403, 'FORBIDDEN', 'You do not have permission to do this'),
  invalidCredentials: () =>
    new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'),
  sessionExpired: () =>
    new AppError(401, 'SESSION_EXPIRED', 'Your session has expired, please log in again'),
  accountBlocked: () => new AppError(403, 'ACCOUNT_BLOCKED', 'Account blocked'),
  emailTaken: () => new AppError(409, 'EMAIL_TAKEN', 'Email already registered'),
  linkExpired: () => new AppError(410, 'LINK_EXPIRED', 'Link expired'),
  invalidCurrentPassword: () =>
    new AppError(400, 'INVALID_CURRENT_PASSWORD', 'Current password is incorrect'),
  fileTooLarge: () => new AppError(413, 'FILE_TOO_LARGE', 'Photo must be 2 MB or smaller'),
  unsupportedFileType: () =>
    new AppError(415, 'UNSUPPORTED_FILE_TYPE', 'Photo must be a JPG or PNG image'),
  tooManyAttempts: () =>
    new AppError(429, 'TOO_MANY_ATTEMPTS', 'Too many failed attempts. Try again later.'),
  notFound: () => new AppError(404, 'NOT_FOUND', 'Not found'),
};
