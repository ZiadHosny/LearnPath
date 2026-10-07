import type { RequestHandler } from 'express';
import type { AppLogger } from './app-logger.service.js';
import type { LogLevel } from './logger.config.js';

// Long base64url-like path segments are tokens (e.g. reset links): never print them.
const TOKEN_SEGMENT = /\/[A-Za-z0-9_-]{32,}(?=\/|$)/g;

function safePath(originalUrl: string): string {
  const path = originalUrl.split('?')[0]; // the query string is never logged
  return path.replace(TOKEN_SEGMENT, '/***');
}

function levelFor(status: number): LogLevel {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'log';
}

// One line per finished request: method, path, status, duration. No bodies, headers or cookies.
export function createRequestLogger(logger: AppLogger): RequestHandler {
  return (req, res, next) => {
    const started = process.hrtime.bigint();
    res.on('finish', () => {
      const ms = Number((process.hrtime.bigint() - started) / 1_000_000n);
      const level = levelFor(res.statusCode);
      logger[level](`${req.method} ${safePath(req.originalUrl)} ${res.statusCode} ${ms}ms`, {
        context: 'HTTP',
        ...(req.requestId ? { requestId: req.requestId } : {}),
      });
    });
    next();
  };
}
