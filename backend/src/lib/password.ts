import bcrypt from 'bcrypt';
import { env } from '../config/env.validation.js';
import { en } from '../i18n/locales/en.js';

// English text of the password rule, for the API docs. The rule itself is applied by
// @PasswordRule() (common/dto/password-rule.ts); responses use the translated text.
export const PASSWORD_RULE_MESSAGE = en.validation.passwordRule;

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
