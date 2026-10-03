import { describe, expect, it } from 'vitest';
import { env } from '../../src/config/env.js';
import { api } from '../helpers/app.js';
import { prisma } from '../helpers/db.js';

const valid = {
  fullName: 'Ali Hassan',
  email: 'ali@example.com',
  password: 'abc12345',
  confirmPassword: 'abc12345',
};

const register = (body: Record<string, unknown>) => api.post('/api/auth/register').send(body);

async function expectNoUsers() {
  expect(await prisma.user.count()).toBe(0);
}

describe('US-01 Register an account', () => {
  it('US-01 S1: valid sign-up creates a Student, returns a login and sets the refresh cookie', async () => {
    const res = await register(valid);

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(res.body.expiresIn).toBe(900);
    expect(res.body.user).toEqual({
      id: expect.any(String),
      fullName: 'Ali Hassan',
      email: 'ali@example.com',
      role: 'STUDENT',
      photoUrl: null,
      bio: null,
    });

    const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) =>
      c.startsWith('lp_refresh='),
    );
    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/HttpOnly/i);
    expect(cookie).toMatch(/SameSite=Strict/i);
    expect(cookie).toMatch(/Path=\/api\/auth/);

    const stored = await prisma.user.findUniqueOrThrow({ where: { email: 'ali@example.com' } });
    expect(stored.role).toBe('STUDENT');
    expect(stored.status).toBe('ACTIVE');
  });

  it('US-01 S2: duplicate email is refused, ignoring case and surrounding spaces', async () => {
    await register(valid).expect(201);

    for (const email of ['ali@example.com', ' Ali@EXAMPLE.com ']) {
      const res = await register({ ...valid, email });
      expect(res.status).toBe(409);
      expect(res.body.error).toEqual({ code: 'EMAIL_TAKEN', message: 'Email already registered' });
    }
    expect(await prisma.user.count()).toBe(1);
  });

  it('US-01 S3: malformed email is refused with a field error', async () => {
    const res = await register({ ...valid, email: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details[0].field).toBe('email');
    await expectNoUsers();
  });

  it.each([
    ['too short', 'abc1234'],
    ['no digit', 'abcdefgh'],
    ['no letter', '12345678'],
  ])('US-01 S4: password rule is enforced (%s)', async (_label, password) => {
    const res = await register({ ...valid, password, confirmPassword: password });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain('password');
    await expectNoUsers();
  });

  it('US-01 S5: password confirmation must match', async () => {
    const res = await register({ ...valid, confirmPassword: 'abc12346' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain('confirmPassword');
    await expectNoUsers();
  });

  it('US-01 S6: the password is stored only as a bcrypt hash and never returned', async () => {
    const res = await register(valid);

    const stored = await prisma.user.findUniqueOrThrow({
      where: { email: valid.email },
      omit: { passwordHash: false },
    });
    expect(stored.passwordHash).not.toBe(valid.password);
    expect(stored.passwordHash.startsWith(`$2b$${String(env.BCRYPT_COST).padStart(2, '0')}$`)).toBe(true);

    const body = JSON.stringify(res.body);
    expect(body).not.toContain(valid.password);
    expect(body).not.toMatch(/password/i);
  });

  it.each([
    ['1 character', 'A'],
    ['101 characters', 'A'.repeat(101)],
  ])('US-01 S3: full name length is enforced (%s)', async (_label, fullName) => {
    const res = await register({ ...valid, fullName });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('fullName');
    await expectNoUsers();
  });
});
