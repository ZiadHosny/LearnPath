import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError, Errors } from '../lib/errors.js';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(Errors.notFound());
};

// Never logs request bodies: they can contain passwords.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {}),
      },
    });
    return;
  }

  // Malformed JSON body from express.json()
  if (err?.type === 'entity.parse.failed' || err?.type === 'entity.too.large') {
    res.status(err.status ?? 400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' },
    });
    return;
  }

  console.error(`Unhandled error on ${req.method} ${req.path}:`, err?.stack ?? err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
};
