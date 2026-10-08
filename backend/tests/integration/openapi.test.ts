import SwaggerParser from '@apidevtools/swagger-parser';
import { Controller, Get } from '@nestjs/common';
import { api, initApp } from '../helpers/app.js';

// Every operation, as it must appear in the generated document: the 11 EP-01 operations
// (001 contract) plus the 11 from Sprint 2 (007: users, categories, courses).
const EXPECTED = [
  'post /api/auth/register',
  'post /api/auth/login',
  'post /api/auth/refresh',
  'post /api/auth/logout',
  'get /api/users/me',
  'patch /api/users/me',
  'put /api/users/me/photo',
  'post /api/users/me/password',
  'post /api/auth/password-reset/request',
  'get /api/auth/password-reset/{token}',
  'post /api/auth/password-reset/confirm',
  'get /api/admin/users',
  'patch /api/admin/users/{id}/role',
  'get /api/categories',
  'post /api/categories',
  'patch /api/categories/{id}',
  'delete /api/categories/{id}',
  'post /api/courses',
  'get /api/courses/mine',
  'get /api/courses/{id}',
  'patch /api/courses/{id}',
  'put /api/courses/{id}/thumbnail',
].sort();

type Doc = {
  openapi: string;
  paths: Record<string, Record<string, { tags?: string[]; security?: Record<string, unknown>[] }>>;
  components: { schemas: Record<string, { properties?: Record<string, Record<string, unknown>> }> };
};

async function getDoc(): Promise<Doc> {
  const res = await api.get('/api/openapi.json');
  expect(res.status).toBe(200);
  return res.body as Doc;
}

function operations(doc: Doc): string[] {
  return Object.entries(doc.paths)
    .flatMap(([path, item]) => Object.keys(item).map((method) => `${method} ${path}`))
    .sort();
}

// A controller that exists only in this test, to prove docs follow the code (SC-005).
@Controller('docs-check')
class ThrowAwayController {
  @Get() ping() {
    return { ok: true };
  }
}

describe('US2 API documentation generated from the code', () => {
  it('serves an OpenAPI 3 document with exactly the expected operations (SC-004)', async () => {
    const doc = await getDoc();
    expect(doc.openapi.startsWith('3.')).toBe(true);
    expect(operations(doc)).toEqual(EXPECTED);
  });

  it('is a valid OpenAPI document, so Apidog / Postman / Swagger UI can import it', async () => {
    const doc = await getDoc();
    await expect(SwaggerParser.validate(structuredClone(doc) as never)).resolves.toBeDefined();
  });

  it('groups endpoints by area', async () => {
    const doc = await getDoc();
    const tags = new Set(Object.values(doc.paths).flatMap((item) => Object.values(item).flatMap((op) => op.tags ?? [])));
    expect([...tags].sort()).toEqual(['Admin', 'Auth', 'Categories', 'Courses', 'Password reset', 'Profile']);
  });

  it('shows request rules and examples from the DTOs (FR-013)', async () => {
    const doc = await getDoc();
    const register = doc.components.schemas.RegisterDto.properties!;
    expect(register.fullName).toMatchObject({ minLength: 2, maxLength: 100 });
    expect(register.fullName.example).toBeDefined();
    expect(register.email).toMatchObject({ format: 'email' });
  });

  it('marks protected endpoints with bearerAuth and refresh/logout with the cookie', async () => {
    const doc = await getDoc();
    expect(doc.paths['/api/users/me'].get.security).toEqual([{ bearerAuth: [] }]);
    expect(doc.paths['/api/auth/refresh'].post.security).toEqual([{ refreshCookie: [] }]);
    expect(doc.paths['/api/auth/logout'].post.security).toEqual([{ refreshCookie: [] }]);
    expect(doc.paths['/api/auth/login'].post.security).toBeUndefined();
  });

  it('serves the Swagger UI page at /api/docs', async () => {
    const res = await api.get('/api/docs/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });

  it('includes a new endpoint with no documentation file edited (SC-005)', async () => {
    await initApp({ controllers: [ThrowAwayController] });
    try {
      const doc = await getDoc();
      expect(doc.paths['/api/docs-check']).toBeDefined();
    } finally {
      await initApp();
    }
  });

  it('is not available in production (FR-014)', async () => {
    const previous = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      await initApp();
      for (const url of ['/api/docs', '/api/openapi.json']) {
        const res = await api.get(url);
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
      }
    } finally {
      process.env.NODE_ENV = previous;
      await initApp();
    }
  });
});
