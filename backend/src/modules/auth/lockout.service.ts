import { prisma } from '../../db/prisma.js';
import { MINUTE, now } from '../../lib/clock.js';

const MAX_FAILURES = 5;
const WINDOW_MS = 15 * MINUTE;
const BLOCK_MS = 15 * MINUTE;
const PRUNE_AFTER_MS = 30 * MINUTE;

// Blocked when the last 5 failures fall within 15 minutes of each other, for 15 minutes after
// the fifth one (FR-010). Attempts made while blocked are not recorded, so the block never grows.
export async function checkBlock(email: string): Promise<{ blocked: boolean; retryAfterSeconds: number }> {
  const current = now();
  await prisma.loginAttempt.deleteMany({
    where: { attemptedAt: { lt: new Date(current.getTime() - PRUNE_AFTER_MS) } },
  });

  const recent = await prisma.loginAttempt.findMany({
    where: { email },
    orderBy: { attemptedAt: 'desc' },
    take: MAX_FAILURES,
    select: { attemptedAt: true },
  });
  if (recent.length < MAX_FAILURES) return { blocked: false, retryAfterSeconds: 0 };

  const newest = recent[0].attemptedAt.getTime();
  const oldest = recent[MAX_FAILURES - 1].attemptedAt.getTime();
  const blockEnds = newest + BLOCK_MS;
  if (newest - oldest > WINDOW_MS || current.getTime() >= blockEnds) {
    return { blocked: false, retryAfterSeconds: 0 };
  }
  return { blocked: true, retryAfterSeconds: Math.ceil((blockEnds - current.getTime()) / 1000) };
}

export async function recordFailure(email: string): Promise<void> {
  await prisma.loginAttempt.create({ data: { email, attemptedAt: now() } });
}

export async function clearFailures(email: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { email } });
}
