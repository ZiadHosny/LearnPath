// English: the default language and the source of every API text.
// Other languages must have exactly these keys (enforced by the Translation type).
export const en = {
  errors: {
    VALIDATION_ERROR: 'Some fields are invalid',
    INVALID_CURRENT_PASSWORD: 'Current password is incorrect',
    CANNOT_CHANGE_OWN_ROLE: 'You cannot change your own role',
    UNAUTHENTICATED: 'Please log in',
    INVALID_CREDENTIALS: 'Invalid email or password',
    SESSION_EXPIRED: 'Your session has expired, please log in again',
    FORBIDDEN: 'You do not have permission to do this',
    ACCOUNT_BLOCKED: 'Account blocked',
    NOT_FOUND: 'Not found',
    EMAIL_TAKEN: 'Email already registered',
    CATEGORY_EXISTS: 'Category name already exists',
    CATEGORY_IN_USE: 'This category is used by {{count}} courses and cannot be deleted',
    LINK_EXPIRED: 'Link expired',
    FILE_TOO_LARGE: 'Image must be 2 MB or smaller',
    UNSUPPORTED_FILE_TYPE: 'Image must be a JPG or PNG file',
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
    thumbnailRequired: 'Choose an image to upload',
    invalidJson: 'Request body is not valid JSON',
    languageInvalid: 'Choose one of the available languages',
    unknownField: '{{field}} is not an allowed field',
    invalidValue: 'This value is not valid',
    roleInvalid: 'Choose Student, Instructor or Admin',
    categoryNameLength: 'Category name must be 2–60 characters',
    titleLength: 'Title must be 1–120 characters',
    shortDescriptionLength: 'Short description must be 1–250 characters',
    descriptionTooLong: 'Description must be 5,000 characters or fewer',
    outcomesTooMany: 'Add at most 10 learning outcomes',
    outcomeTooLong: 'Each learning outcome must be 120 characters or fewer',
    levelInvalid: 'Choose Beginner, Intermediate or Advanced',
    categoryInvalid: 'Choose an existing category',
  },
  messages: {
    resetLinkSent: 'If an account exists for this email, a reset link has been sent.',
    categoryInUseOne: 'This category is used by 1 course and cannot be deleted',
  },
} as const;

type DeepStrings<T> = { readonly [K in keyof T]: T[K] extends string ? string : DeepStrings<T[K]> };

// Every language file is typed with this, so a missing key fails the type check (US-31).
export type Translation = DeepStrings<typeof en>;
