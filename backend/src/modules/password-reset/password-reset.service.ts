import { env } from '../../config/env.js';
import { prisma } from '../../db/prisma.js';
import { MINUTE, now } from '../../lib/clock.js';
import { Errors } from '../../lib/errors.js';
import { sendPasswordResetEmail } from '../../lib/mailer.js';
import { hashPassword } from '../../lib/password.js';
import { randomToken, sha256Hex } from '../../lib/tokens.js';

// Returns immediately; the email (if any) is sent afterwards so timing reveals nothing (FR-022).
export async function request(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });
  if (!user) return;

  const token = randomToken();
  await prisma.$transaction([
    // Only the latest link works (FR-025).
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: sha256Hex(token),
        createdAt: now(),
        expiresAt: new Date(now().getTime() + env.RESET_TOKEN_TTL_MINUTES * MINUTE),
      },
    }),
  ]);

  const link = `${env.APP_URL}/reset-password/${token}`;
  setImmediate(() => {
    sendPasswordResetEmail(user.email, link).catch((error: unknown) => {
      // Never log the link: it is a credential.
      console.error('Failed to send password reset email:', (error as Error).message);
    });
  });
}

async function findValid(token: string) {
  const record = await prisma.passwordResetToken.findUnique({ where: { tokenHash: sha256Hex(token) } });
  if (!record || record.usedAt || record.expiresAt <= now()) throw Errors.linkExpired();
  return record;
}

export async function check(token: string): Promise<void> {
  await findValid(token);
}

// Sets the new password, marks the link used and ends every session. Status is untouched.
export async function confirm(token: string, newPassword: string): Promise<void> {
  const record = await findValid(token);
  const passwordHash = await hashPassword(newPassword);
  const at = now();

  await prisma.$transaction(async (tx) => {
    // Guard against the same link being used twice at once.
    const used = await tx.passwordResetToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: at },
    });
    if (used.count === 0) throw Errors.linkExpired();

    await tx.user.update({ where: { id: record.userId }, data: { passwordHash } });
    await tx.session.updateMany({
      where: { userId: record.userId, endedAt: null },
      data: { endedAt: at },
    });
  });
}
