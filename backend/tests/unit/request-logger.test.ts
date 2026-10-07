import { EventEmitter } from 'node:events';
import type { NextFunction, Request, Response } from 'express';
import { AppLogger } from '../../src/common/logging/app-logger.service.js';
import type { LogLevel } from '../../src/common/logging/logger.config.js';
import { createRequestLogger } from '../../src/common/logging/request-logger.middleware.js';

function run(method: string, url: string, status: number) {
  const lines: Array<{ line: string; level: LogLevel }> = [];
  const logger = new AppLogger({ level: 'verbose', colors: false, sink: (line, level) => lines.push({ line, level }) });
  const res = Object.assign(new EventEmitter(), { statusCode: status }) as unknown as Response;
  const next = (() => undefined) as NextFunction;
  createRequestLogger(logger)({ method, originalUrl: url } as Request, res, next);
  expect(lines).toHaveLength(0); // nothing until the response is finished
  (res as unknown as EventEmitter).emit('finish');
  return lines;
}

describe('TS-03 US3 request lines', () => {
  it('logs one line with method, path, status and duration when the response finishes', () => {
    const lines = run('GET', '/api/users/me', 200);
    expect(lines).toHaveLength(1);
    expect(lines[0].line).toMatch(/\[HTTP\] GET \/api\/users\/me 200 \d+ms/);
  });

  it.each([
    [200, 'log'],
    [302, 'log'],
    [404, 'warn'],
    [401, 'warn'],
    [500, 'error'],
  ] as const)('status %i is logged at %s level', (status, level) => {
    expect(run('POST', '/api/auth/login', status)[0].level).toBe(level);
  });

  it('never logs the query string', () => {
    const [{ line }] = run('GET', '/api/users/me?token=secret-value', 200);
    expect(line).not.toContain('secret-value');
    expect(line).not.toContain('?');
  });

  it('masks long token-like path segments (reset links)', () => {
    const token = 'UsPibX5_nfPCjG4mC1O1DBxLVvkONXXG2sT5BpqO3DI';
    const [{ line }] = run('GET', `/api/auth/password-reset/${token}`, 410);
    expect(line).not.toContain(token);
    expect(line).toContain('/api/auth/password-reset/***');
  });
});
