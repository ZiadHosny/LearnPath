import { Controller, Get } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { Roles } from '../../src/common/decorators/roles.decorator.js';
import type { Role } from '../../src/generated/prisma/enums.js';
import { advance, MINUTE } from '../../src/lib/clock.js';
import { api, initApp } from '../helpers/app.js';
import { createUser } from '../helpers/factories.js';

// Test-only routes, one per role. EP-01 has no real role-restricted business endpoints yet.
@Controller('__test')
class TestRolesController {
  @Get('student') @Roles('STUDENT') student() { return { ok: true }; }
  @Get('instructor') @Roles('INSTRUCTOR') instructor() { return { ok: true }; }
  @Get('admin') @Roles('ADMIN') admin() { return { ok: true }; }
}

beforeAll(async () => {
  await initApp({ controllers: [TestRolesController] });
});

async function tokenFor(role: Role) {
  const { user, password } = await createUser({ role });
  const res = await api.post('/api/auth/login').send({ email: user.email, password }).expect(200);
  return res.body.accessToken as string;
}

const routes = { STUDENT: 'student', INSTRUCTOR: 'instructor', ADMIN: 'admin' } as const;

describe('US-04 Role-based access', () => {
  it.each([
    ['no header', undefined],
    ['malformed header', 'Token abc'],
    ['garbage token', 'Bearer not.a.jwt'],
    ['bad signature', `Bearer ${jwt.sign({ sub: 'x', role: 'ADMIN', sid: 'y' }, 'another-secret-another-secret-123')}`],
  ])('US-04 S1: %s is refused as not authenticated', async (_label, header) => {
    for (const path of ['/api/__test/admin', '/api/users/me']) {
      const req = api.get(path);
      const res = await (header ? req.set('Authorization', header) : req);
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHENTICATED');
    }
  });

  it('US-04 S1: an expired access token is refused as not authenticated', async () => {
    const token = await tokenFor('ADMIN');
    advance(16 * MINUTE);
    const res = await api.get('/api/__test/admin').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('US-04 S2: a Student calling instructor or admin actions is refused as not permitted', async () => {
    const token = await tokenFor('STUDENT');
    for (const path of ['/api/__test/instructor', '/api/__test/admin']) {
      const res = await api.get(path).set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
      expect(res.body.error).toEqual({
        code: 'FORBIDDEN',
        message: 'You do not have permission to do this',
      });
    }
  });

  it.each(['STUDENT', 'INSTRUCTOR', 'ADMIN'] as const)(
    'US-04 S2: a %s reaches only their own role route',
    async (role) => {
      const token = await tokenFor(role);
      for (const [other, path] of Object.entries(routes)) {
        const res = await api.get(`/api/__test/${path}`).set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(other === role ? 200 : 403);
      }
    },
  );
});
