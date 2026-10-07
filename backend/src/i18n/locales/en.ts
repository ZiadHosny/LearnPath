// English: the default language and the source of every API text.
// Other languages must have exactly these keys (enforced by the Translation type).
export const en = {
  errors: {
    VALIDATION_ERROR: 'Some fields are invalid',
    INVALID_CURRENT_PASSWORD: 'Current password is incorrect',
    UNAUTHENTICATED: 'Please log in',
    INVALID_CREDENTIALS: 'Invalid email or password',
    SESSION_EXPIRED: 'Your session has expired, please log in again',
    FORBIDDEN: 'You do not have permission to do this',
    ACCOUNT_BLOCKED: 'Account blocked',
    NOT_FOUND: 'Not found',
    EMAIL_TAKEN: 'Email already registered',
    LINK_EXPIRED: 'Link expired',
    FILE_TOO_LARGE: 'Photo must be 2 MB or smaller',
    UNSUPPORTED_FILE_TYPE: 'Photo must be a JPG or PNG image',
    TOO_MANY_ATTEMPTS: 'Too many failed attempts. Try again later.',
    INTERNAL: 'Something went wrong',
  },
  validation: {
    fullNameLength: 'Full name must be 2–100 characters',
    emailInvalid: 'Enter a valid email',
    emailTooLong: 'Email is too long',
    emailRequired: 'Email is required',
    passwordRequired: 'Password is required',
    currentPasswordRequired: 'Current password is required',
    passwordRule: 'Password must be at least 8 characters with a letter and a number',
    passwordsMismatch: 'Passwords do not match',
    bioTooLong: 'Bio must be 500 characters or fewer',
    photoRequired: 'Choose a photo to upload',
    invalidJson: 'Request body is not valid JSON',
    languageInvalid: 'Choose one of the available languages',
    unknownField: '{{field}} is not an allowed field',
    invalidValue: 'This value is not valid',
  },
  messages: {
    resetLinkSent: 'If an account exists for this email, a reset link has been sent.',
  },
} as const;

type DeepStrings<T> = { readonly [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };

// Every language file is typed with this, so a missing key fails the type check (US-31).
export type Translation = DeepStrings<typeof en>;
