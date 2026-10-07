import bcrypt from 'bcrypt';
import { env } from '../config/env.validation.js';

// The rule itself is applied by @PasswordRule() (common/dto/password-rule.ts).
export const PASSWORD_RULE_MESSAGE =
  'Password must be at least 8 characters with a letter and a number';

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
