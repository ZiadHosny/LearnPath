import type { RequestHandler } from 'express';
import { Errors } from '../lib/errors.js';
import { verifyAccessToken } from '../lib/tokens.js';

export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.get('authorization') ?? '';
  const match = /^Bearer\s+(\S+)$/i.exec(header);
  if (!match) throw Errors.unauthenticated();

  try {
    const claims = verifyAccessToken(match[1]);
    req.auth = { userId: claims.sub, role: claims.role, sessionId: claims.sid };
  } catch {
    throw Errors.unauthenticated();
  }
  next();
};
