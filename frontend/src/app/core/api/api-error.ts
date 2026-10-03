import { HttpErrorResponse } from '@angular/common/http';

// Exact texts from contracts/ui-routes.md ("Visible messages").
const MESSAGES: Record<string, string> = {
  EMAIL_TAKEN: 'Email already registered',
  INVALID_CREDENTIALS: 'Invalid email or password',
  ACCOUNT_BLOCKED: 'Account blocked',
  LINK_EXPIRED: 'Link expired',
  INVALID_CURRENT_PASSWORD: 'Current password is incorrect',
  FILE_TOO_LARGE: 'Photo must be a JPG or PNG image of 2 MB or less',
  UNSUPPORTED_FILE_TYPE: 'Photo must be a JPG or PNG image of 2 MB or less',
};

export function errorCode(error: unknown): string | null {
  if (error instanceof HttpErrorResponse) return error.error?.error?.code ?? null;
  return null;
}

export function messageFor(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Something went wrong. Please try again.';
  if (error.status === 0) return 'Cannot reach the server. Check your connection and try again.';

  const code = errorCode(error);
  if (code === 'TOO_MANY_ATTEMPTS') {
    const seconds = Number(error.headers.get('Retry-After') ?? 900);
    const minutes = Math.max(1, Math.ceil(seconds / 60));
    return `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`;
  }
  if (code && MESSAGES[code]) return MESSAGES[code];
  return error.error?.error?.message ?? 'Something went wrong. Please try again.';
}
