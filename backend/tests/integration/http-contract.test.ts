import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { Public } from '../../src/common/decorators/public.decorator.js';
import { configureResponseFormat } from '../../src/common/http/response-format.js';
import { AppLogger } from '../../src/common/logging/app-logger.service.js';
import type { LogLevel } from '../../src/common/logging/logger.config.js';
import { api, currentApp, initApp } from '../helpers/app.js';

// Test-only endpoints for behaviour no real endpoint has yet.
@Public()
@Controller('__http')
class HttpContractTestController {
  @Get('boom')
  boom(): never {
    throw new Error('kaboom internal detail');
  }

  @Get('ok')
  ok() {
    return { hello: 'world' };
  }

  @Post('empty')
  @HttpCode(204)
  empty(): void {}
}

describe('TS-04 global HTTP contract', () => {
  let lines: Array<{ line: string; level: LogLevel }>;

  beforeAll(async () => {
    await initApp({ controllers: [HttpContractTestController] });
  });

  beforeEach(() => {
    lines = [];
    currentApp()
      .get(AppLogger)
      .configure({ level: 'verbose', colors: false, sink: (line, level) => lines.push({ line, level }) });
  });

  afterEach(() => {
    currentApp().get(AppLogger).configure({ level: 'error', sink: undefined });
    configureResponseFormat({ envelope: false });
  });

  it('puts X-Request-Id on every kind of response', async () => {
    for (const res of [
      await api.get('/api/__http/ok'),
      await api.get('/api/users/me'),
      await api.get('/api/nope'),
      await api.post('/api/auth/register').send({}),
    ]) {
      expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    }
  });

  it('echoes a valid caller id and logs it on the request line', async () => {
    const res = await api.get('/api/__http/ok').set('X-Request-Id', 'trace-abc-123');
    expect(res.headers['x-request-id']).toBe('trace-abc-123');
    const requestLine = lines.find((l) => l.line.includes('[HTTP] GET /api/__http/ok'));
    expect(requestLine?.line).toContain('requestId=trace-abc-123');
  });

  it('answers an unexpected error with the generic 500 and logs it once with the request id and stack', async () => {
    const res = await api.get('/api/__http/boom').set('X-Request-Id', 'trace-boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
    expect(JSON.stringify(res.body)).not.toContain('kaboom');

    const errorLines = lines.filter((l) => l.level === 'error' && l.line.includes('[Exceptions]'));
    expect(errorLines).toHaveLength(1);
    expect(errorLines[0].line).toContain('requestId=trace-boom');
    expect(errorLines[0].line).toContain('kaboom internal detail');
  });

  it('keeps success bodies unchanged by default', async () => {
    const res = await api.get('/api/__http/ok');
    expect(res.body).toEqual({ hello: 'world' });
  });

  it('wraps success bodies in { data } when the envelope is on; 204 and errors are unchanged', async () => {
    configureResponseFormat({ envelope: true });
    expect((await api.get('/api/__http/ok')).body).toEqual({ data: { hello: 'world' } });

    const empty = await api.post('/api/__http/empty');
    expect(empty.status).toBe(204);
    expect(empty.text).toBe('');

    const error = await api.get('/api/users/me');
    expect(error.body).toEqual({ error: { code: 'UNAUTHENTICATED', message: 'Please log in' } });
  });
});
