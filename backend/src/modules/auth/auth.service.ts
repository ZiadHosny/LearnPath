import { Injectable } from '@nestjs/common';
import { Errors, TooManyAttemptsError } from '../../common/http/app-error.js';
import { AppLogger } from '../../common/logging/app-logger.service.js';
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
    private readonly logger: AppLogger,
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
    this.logger.success('User registered', { context: AuthService.name, story: 'US-01', userId: user.id });
    return { auth: this.sessions.buildAuthResponse(user, sessionId), refreshToken };
  }

  // Order matters: block window → credentials → account status (contracts/auth-api.md).
  async login({ email, password }: LoginDto) {
    // Login logs never include the email address: user id only, when known.
    const log = { context: AuthService.name, story: 'US-02' };
    const block = await this.lockout.checkBlock(email);
    if (block.blocked) {
      this.logger.warn('Login refused: too many failed attempts', log);
      throw new TooManyAttemptsError(block.retryAfterSeconds);
    }

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
      this.logger.warn('Login failed', { ...log, reason: user ? 'wrong_password' : 'unknown_account', ...(user ? { userId: user.id } : {}) });
      throw Errors.invalidCredentials();
    }
    if (user.status === 'BLOCKED') {
      this.logger.warn('Login refused: account blocked', { ...log, userId: user.id });
      throw Errors.accountBlocked();
    }

    await this.lockout.clearFailures(email);
    const { sessionId, refreshToken } = await this.sessions.createSession(user.id);
    this.logger.success('User logged in', { ...log, userId: user.id, role: user.role });
    return { auth: this.sessions.buildAuthResponse(user, sessionId), refreshToken };
  }
}
