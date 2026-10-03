import { prisma } from '../../db/prisma.js';
import { Prisma } from '../../generated/prisma/client.js';
import { AppError, Errors } from '../../lib/errors.js';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../../lib/password.js';
import type { LoginInput, RegisterInput } from './auth.schemas.js';
import { checkBlock, clearFailures, recordFailure } from './lockout.service.js';
import { buildAuthResponse, createSession } from './session.service.js';

export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (existing) throw Errors.emailTaken();

  let user;
  try {
    user = await prisma.user.create({
      data: {
        fullName: input.fullName,
        email: input.email,
        passwordHash: await hashPassword(input.password),
        role: 'STUDENT',
        status: 'ACTIVE',
      },
    });
  } catch (error) {
    // Two sign-ups racing for the same email.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw Errors.emailTaken();
    }
    throw error;
  }

  const { sessionId, refreshToken } = await createSession(user.id);
  return { auth: buildAuthResponse(user, sessionId), refreshToken };
}

export class TooManyAttemptsError extends AppError {
  constructor(public readonly retryAfterSeconds: number) {
    super(429, 'TOO_MANY_ATTEMPTS', 'Too many failed attempts. Try again later.');
  }
}

// Order matters: block window → credentials → account status (contracts/auth-api.md).
export async function login({ email, password }: LoginInput) {
  const block = await checkBlock(email);
  if (block.blocked) throw new TooManyAttemptsError(block.retryAfterSeconds);

  const user = await prisma.user.findUnique({ where: { email }, omit: { passwordHash: false } });
  const passwordOk = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyAgainstDummy(password);

  if (!user || !passwordOk) {
    await recordFailure(email);
    throw Errors.invalidCredentials();
  }
  if (user.status === 'BLOCKED') throw Errors.accountBlocked();

  await clearFailures(email);
  const { sessionId, refreshToken } = await createSession(user.id);
  return { auth: buildAuthResponse(user, sessionId), refreshToken };
}
