import { Router } from 'express';
import { AppError } from '../../lib/errors.js';
import { validate } from '../../middleware/validate.js';
import { loginSchema, registerSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';
import * as sessions from './session.service.js';

export const authRouter = Router();

authRouter.post('/auth/register', validate({ body: registerSchema }), async (req, res) => {
  const { auth, refreshToken } = await authService.register(req.body);
  sessions.setRefreshCookie(res, refreshToken);
  res.status(201).json(auth);
});

authRouter.post('/auth/login', validate({ body: loginSchema }), async (req, res) => {
  try {
    const { auth, refreshToken } = await authService.login(req.body);
    sessions.setRefreshCookie(res, refreshToken);
    res.json(auth);
  } catch (error) {
    if (error instanceof authService.TooManyAttemptsError) {
      res.set('Retry-After', String(error.retryAfterSeconds));
    }
    throw error;
  }
});

authRouter.post('/auth/logout', async (req, res) => {
  await sessions.endSession(req.cookies?.[sessions.REFRESH_COOKIE]);
  sessions.clearRefreshCookie(res);
  res.status(204).end();
});

authRouter.post('/auth/refresh', async (req, res) => {
  try {
    res.json(await sessions.refresh(req.cookies?.[sessions.REFRESH_COOKIE]));
  } catch (error) {
    if (error instanceof AppError) sessions.clearRefreshCookie(res);
    throw error;
  }
});
