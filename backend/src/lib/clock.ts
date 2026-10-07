// All time-based rules (token expiry, lockout, reset links) read the time from here,
// so tests can move the clock instead of waiting.
let offsetMs = 0;
let fixed: Date | null = null;

export function now(): Date {
  if (fixed) return new Date(fixed.getTime() + offsetMs);
  return new Date(Date.now() + offsetMs);
}

export function setNow(date: Date): void {
  fixed = date;
  offsetMs = 0;
}

export function advance(ms: number): void {
  offsetMs += ms;
}

export function resetClock(): void {
  fixed = null;
  offsetMs = 0;
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;
