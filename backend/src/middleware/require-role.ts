import type { RequestHandler } from 'express';
import type { Role } from '../generated/prisma/enums.js';
import { Errors } from '../lib/errors.js';

// Use after `authenticate`.
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) throw Errors.unauthenticated();
    if (!roles.includes(req.auth.role)) throw Errors.forbidden();
    next();
  };
}
