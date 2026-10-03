import { Router } from 'express';
import { validate } from '../../middleware/validate.js';
import { confirmSchema, requestSchema, tokenParams } from './password-reset.schemas.js';
import * as passwordReset from './password-reset.service.js';

export const passwordResetRouter = Router();

const SENT_MESSAGE = 'If an account exists for this email, a reset link has been sent.';

passwordResetRouter.post(
  '/auth/password-reset/request',
  validate({ body: requestSchema }),
  async (req, res) => {
    await passwordReset.request(req.body.email);
    res.status(202).json({ message: SENT_MESSAGE });
  },
);

passwordResetRouter.get(
  '/auth/password-reset/:token',
  validate({ params: tokenParams }),
  async (req, res) => {
    await passwordReset.check(req.params.token as string);
    res.json({ valid: true });
  },
);

passwordResetRouter.post(
  '/auth/password-reset/confirm',
  validate({ body: confirmSchema }),
  async (req, res) => {
    await passwordReset.confirm(req.body.token, req.body.newPassword);
    res.status(204).end();
  },
);
