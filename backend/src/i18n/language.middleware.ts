import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request, RequestHandler } from 'express';
import { DEFAULT_LANGUAGE, type LanguageCode } from './languages.js';
import { resolveLanguage } from './translate.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      language?: LanguageCode;
    }
  }
}

// Picks the response language from Accept-Language and announces it in Content-Language.
export const language: RequestHandler = (req, res, next) => {
  req.language = resolveLanguage(req.get('accept-language'));
  res.setHeader('Content-Language', req.language);
  next();
};

// The request's language in a controller: handler(@Lang() lang: LanguageCode).
export const Lang = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): LanguageCode =>
    ctx.switchToHttp().getRequest<Request>().language ?? DEFAULT_LANGUAGE,
);
