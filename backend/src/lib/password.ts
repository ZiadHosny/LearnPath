import bcrypt from 'bcrypt';
import { z } from 'zod';
import { env } from '../config/env.js';

export const PASSWORD_RULE_MESSAGE =
  'Password must be at least 8 characters with a letter and a number';

export const passwordRule = z
  .string()
  .min(8, PASSWORD_RULE_MESSAGE)
  .regex(/[A-Za-z]/, PASSWORD_RULE_MESSAGE)
  .regex(/[0-9]/, PASSWORD_RULE_MESSAGE);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, env.BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

// Computed once so a login for an unknown email costs the same as a real compare.
let dummyHash: Promise<string> | undefined;

export async function verifyAgainstDummy(plain: string): Promise<false> {
  dummyHash ??= bcrypt.hash('dummy-password-for-timing-1', env.BCRYPT_COST);
  await bcrypt.compare(plain, await dummyHash);
  return false;
}
