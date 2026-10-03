import { prisma } from '../../db/prisma.js';
import { now } from '../../lib/clock.js';
import { Errors } from '../../lib/errors.js';
import { hashPassword, verifyPassword } from '../../lib/password.js';
import type { ChangePasswordInput, UpdateProfileInput } from './users.schemas.js';

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw Errors.unauthenticated();
  return user;
}

export function updateProfile(userId: string, input: UpdateProfileInput) {
  return prisma.user.update({ where: { id: userId }, data: input });
}

// Keeps the current device signed in and ends every other session (FR-021a).
export async function changePassword(userId: string, sessionId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({ where: { id: userId }, omit: { passwordHash: false } });
  if (!user) throw Errors.unauthenticated();
  if (!(await verifyPassword(input.currentPassword, user.passwordHash))) {
    throw Errors.invalidCurrentPassword();
  }

  const passwordHash = await hashPassword(input.newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
    prisma.session.updateMany({
      where: { userId, id: { not: sessionId }, endedAt: null },
      data: { endedAt: now() },
    }),
  ]);
}
