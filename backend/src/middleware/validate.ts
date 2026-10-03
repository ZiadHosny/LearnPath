import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { AppError } from '../lib/errors.js';

interface Schemas {
  body?: z.ZodType;
  params?: z.ZodType;
}

function toDetails(error: z.ZodError) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || (issue.code === 'unrecognized_keys' ? issue.keys.join(',') : ''),
    message: issue.message,
  }));
}

// Schemas are expected to be strict objects so unknown fields are rejected.
export function validate(schemas: Schemas): RequestHandler {
  return (req, _res, next) => {
    for (const part of ['params', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const result = schema.safeParse(req[part] ?? {});
      if (!result.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Some fields are invalid', toDetails(result.error));
      }
      if (part === 'body') req.body = result.data;
      else Object.assign(req.params, result.data);
    }
    next();
  };
}
