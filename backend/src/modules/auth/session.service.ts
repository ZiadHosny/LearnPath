import type { CookieOptions, Response } from 'express';
import { env } from '../../config/env.js';
import { prisma } from '../../db/prisma.js';
import { DAY, now } from '../../lib/clock.js';
import { Errors } from '../../lib/errors.js';
import { randomToken, sha256Hex, signAccessToken } from '../../lib/tokens.js';
import { toUserDto, type UserDto } from '../users/user.dto.js';

export const REFRESH_COOKIE = 'lp_refresh';

const cookieOptions = (): CookieOptions => ({
  httpOnly: true,
  sameSite: 'strict',
  path: '/api/auth',
  secure: env.COOKIE_SECURE,
});

export interface AuthResponse {
  accessToken: string;
  expiresIn: number;
  user: UserDto;
}

export async function createSession(userId: string) {
  const refreshToken = randomToken();
  const session = await prisma.session.create({
    data: {
      userId,
      refreshTokenHash: sha256Hex(refreshToken),
      createdAt: now(),
      expiresAt: new Date(now().getTime() + env.SESSION_TTL_DAYS * DAY),
    },
  });
  return { sessionId: session.id, refreshToken };
}

// Issues a new 15-minute access token with the user's current role. The session and its
// 7-day expiry stay unchanged (no rotation), so parallel renewals all succeed.
export async function refresh(refreshToken: string | undefined): Promise<AuthResponse> {
  if (!refreshToken) throw Errors.sessionExpired();

  const session = await prisma.session.findUnique({
    where: { refreshTokenHash: sha256Hex(refreshToken) },
    include: { user: true },
  });
  if (!session || session.endedAt || session.expiresAt <= now()) throw Errors.sessionExpired();

  if (session.user.status === 'BLOCKED') {
    await prisma.session.update({ where: { id: session.id }, data: { endedAt: now() } });
    throw Errors.accountBlocked();
  }
  return buildAuthResponse(session.user, session.id);
}

export async function endSession(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;
  await prisma.session.updateMany({
    where: { refreshTokenHash: sha256Hex(refreshToken), endedAt: null },
    data: { endedAt: now() },
  });
}

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, { ...cookieOptions(), maxAge: env.SESSION_TTL_DAYS * DAY });
}

export function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
}

export function buildAuthResponse(
  user: Parameters<typeof toUserDto>[0],
  sessionId: string,
): AuthResponse {
  return {
    accessToken: signAccessToken({ sub: user.id, role: user.role, sid: sessionId }),
    expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    user: toUserDto(user),
  };
}
