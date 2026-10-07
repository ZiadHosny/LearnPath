import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { Errors } from '../../common/http/app-error.js';
import { AppLogger } from '../../common/logging/app-logger.service.js';
import type { EnvironmentVariables } from '../../config/env.validation.js';
import { DAY, now } from '../../lib/clock.js';
import { randomToken, sha256Hex, signAccessToken } from '../../lib/tokens.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { toUserDto, type UserDto } from '../users/user.dto.js';

export const REFRESH_COOKIE = 'lp_refresh';

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: UserDto;
}

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    private readonly logger: AppLogger,
  ) {}

  private cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      sameSite: 'strict',
      path: '/api/auth',
      secure: this.config.get('COOKIE_SECURE', { infer: true }),
    };
  }

  private get sessionTtlMs(): number {
    return this.config.get('SESSION_TTL_DAYS', { infer: true }) * DAY;
  }

  async createSession(userId: string) {
    const refreshToken = randomToken();
    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash: sha256Hex(refreshToken),
        createdAt: now(),
        expiresAt: new Date(now().getTime() + this.sessionTtlMs),
      },
    });
    return { sessionId: session.id, refreshToken };
  }

  // Issues a new 15-minute access token with the user's current role. The session and its
  // 7-day expiry stay unchanged (no rotation), so parallel renewals all succeed.
  async refresh(refreshToken: string | undefined): Promise<AuthResponse> {
    if (!refreshToken) throw Errors.sessionExpired();

    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: sha256Hex(refreshToken) },
      include: { user: true },
    });
    if (!session || session.endedAt || session.expiresAt <= now()) throw Errors.sessionExpired();

    if (session.user.status === 'BLOCKED') {
      await this.prisma.session.update({ where: { id: session.id }, data: { endedAt: now() } });
      throw Errors.accountBlocked();
    }
    return this.buildAuthResponse(session.user, session.id);
  }

  async endSession(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: sha256Hex(refreshToken) },
      select: { id: true, userId: true, endedAt: true },
    });
    if (!session || session.endedAt) return;
    await this.prisma.session.update({ where: { id: session.id }, data: { endedAt: now() } });
    this.logger.success('User logged out', {
      context: SessionService.name,
      story: 'US-03',
      userId: session.userId,
    });
  }

  setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, { ...this.cookieOptions(), maxAge: this.sessionTtlMs });
  }

  clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, this.cookieOptions());
  }

  buildAuthResponse(user: Parameters<typeof toUserDto>[0], sessionId: string): AuthResponse {
    return {
      accessToken: signAccessToken({ sub: user.id, role: user.role, sid: sessionId }),
      expiresIn: this.config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true }),
      user: toUserDto(user),
    };
  }
}
