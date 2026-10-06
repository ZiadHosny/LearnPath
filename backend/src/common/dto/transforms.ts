import { Transform } from 'class-transformer';

// Non-strings pass through untouched so the type validators can reject them.
export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));

export const TrimLowerCase = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));

// Optional text where an empty string means "clear it" (stored as null).
export const TrimOrNull = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() || null : value));
