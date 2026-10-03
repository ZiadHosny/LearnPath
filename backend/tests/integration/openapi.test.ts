import { describe, expect, it } from 'vitest';
import { buildOpenApiDocument } from '../../src/docs/openapi.js';
import { api } from '../helpers/app.js';

const doc = buildOpenApiDocument();
const operations = Object.entries(doc.paths).flatMap(([path, item]) =>
  Object.keys(item).map((method) => ({ method, path: path.replace('{token}', 'some-token') })),
);

describe('OpenAPI document', () => {
  it('is served at /api/openapi.json', async () => {
    const res = await api.get('/api/openapi.json');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.0.3');
    expect(Object.keys(res.body.paths)).toEqual(Object.keys(doc.paths));
  });

  it('describes all 11 endpoints of EP-01', () => {
    expect(operations).toHaveLength(11);
  });

  // Catches documented routes that were renamed or removed in the code.
  it.each(operations)('documents a route that exists: $method $path', async ({ method, path }) => {
    const res = await (api as unknown as Record<string, (p: string) => Promise<{ body: { error?: { code: string } } }>>)[
      method
    ](path);
    expect(res.body.error?.code).not.toBe('NOT_FOUND');
  });
});
