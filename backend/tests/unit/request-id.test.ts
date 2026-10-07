import type { NextFunction, Request, Response } from 'express';
import { REQUEST_ID_HEADER, requestId } from '../../src/common/http/request-id.middleware.js';

function run(incoming?: string) {
  const headers: Record<string, string> = {};
  const req = { get: (name: string) => (name.toLowerCase() === 'x-request-id' ? incoming : undefined) } as unknown as Request;
  const res = { setHeader: (name: string, value: string) => (headers[name] = value) } as unknown as Response;
  let called = false;
  requestId(req, res, (() => (called = true)) as NextFunction);
  return { id: (req as Request & { requestId: string }).requestId, header: headers[REQUEST_ID_HEADER], called };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('TS-04 US2 request id', () => {
  it('creates a new id when the caller sends none', () => {
    const { id, header, called } = run();
    expect(id).toMatch(UUID);
    expect(header).toBe(id);
    expect(called).toBe(true);
  });

  it('keeps a valid caller id', () => {
    expect(run('web-123.abc_X').id).toBe('web-123.abc_X');
  });

  it.each([['too long', 'a'.repeat(65)], ['unsafe characters', 'bad id<script>'], ['empty', '']])(
    'replaces an invalid caller id (%s)',
    (_label, incoming) => {
      const { id } = run(incoming);
      expect(id).toMatch(UUID);
    },
  );
});
