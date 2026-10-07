import { Injectable } from '@nestjs/common';
import { Errors, TooManyAttemptsError } from '../../common/errors.js';
import { Prisma } from '../../generated/prisma/client.js';
import { hashPassword, verifyAgainstDummy, verifyPassword } from '../../lib/password.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegisterDto } from './dto/register.dto.js';
import { LockoutService } from './lockout.service.js';
import { SessionService } from './session.service.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly lockout: LockoutService,
    private readonly sessions: SessionService,
  ) {}

  async register(input: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });
    if (existing) throw Errors.emailTaken();

    let user;
    try {
      user = await this.prisma.user.create({
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

    const { sessionId, refreshToken } = await this.sessions.createSession(user.id);
    return { auth: this.sessions.buildAuthResponse(user, sessionId), refreshToken };
  }

  // Order matters: block window → credentials → account status (contracts/auth-api.md).
  async login({ email, password }: LoginDto) {
    const block = await this.lockout.checkBlock(email);
    if (block.blocked) throw new TooManyAttemptsError(block.retryAfterSeconds);

    const user = await this.prisma.user.findUnique({
      where: { email },
      omit: { passwordHash: false },
    });
    // Unknown emails still pay for one bcrypt compare, so timing reveals nothing.
    const passwordOk = user
      ? await verifyPassword(password, user.passwordHash)
      : await verifyAgainstDummy(password);

    if (!user || !passwordOk) {
      await this.lockout.recordFailure(email);
      throw Errors.invalidCredentials();
    }
    if (user.status === 'BLOCKED') throw Errors.accountBlocked();

    await this.lockout.clearFailures(email);
    const { sessionId, refreshToken } = await this.sessions.createSession(user.id);
    return { auth: this.sessions.buildAuthResponse(user, sessionId), refreshToken };
  }
}
