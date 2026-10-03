import { createHash, randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { Role } from '../generated/prisma/enums.js';
import { now } from './clock.js';

export interface AccessClaims {
  sub: string;
  role: Role;
  sid: string;
}

function nowSeconds(): number {
  return Math.floor(now().getTime() / 1000);
}

export function signAccessToken(claims: AccessClaims): string {
  const iat = nowSeconds();
  return jwt.sign(
    { role: claims.role, sid: claims.sid, iat, exp: iat + env.ACCESS_TOKEN_TTL_SECONDS },
    env.JWT_SECRET,
    { algorithm: 'HS256', subject: claims.sub },
  );
}

// Throws when the token is malformed, badly signed or expired.
export function verifyAccessToken(token: string): AccessClaims {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    algorithms: ['HS256'],
    clockTimestamp: nowSeconds(),
  });
  if (typeof payload === 'string' || !payload.sub || !payload.role || !payload.sid) {
    throw new Error('Invalid token payload');
  }
  return { sub: payload.sub, role: payload.role as Role, sid: payload.sid as string };
}

export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
