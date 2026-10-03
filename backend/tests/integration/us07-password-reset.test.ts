import { beforeEach, describe, expect, it } from 'vitest';
import { advance, MINUTE } from '../../src/lib/clock.js';
import { api, refreshCookieFrom } from '../helpers/app.js';
import { prisma } from '../helpers/db.js';
import { createUser } from '../helpers/factories.js';
import { clearMail, latestMailTo, listMail } from '../helpers/mailpit.js';

const requestReset = (email: string) =>
  api.post('/api/auth/password-reset/request').send({ email });

const confirm = (token: string, password = 'newpass22', confirmPassword = password) =>
  api.post('/api/auth/password-reset/confirm').send({ token, newPassword: password, confirmPassword });

async function tokenFromMail(email: string): Promise<string> {
  const mail = await latestMailTo(email);
  expect(mail, `no reset email for ${email}`).toBeDefined();
  const match = /http:\/\/localhost:4200\/reset-password\/([A-Za-z0-9_-]+)/.exec(mail!.text);
  expect(match).not.toBeNull();
  return match![1];
}

describe('US-07 Reset forgotten password', () => {
  beforeEach(clearMail);

  it('US-07 S1: the answer is the same for registered, unknown and blocked emails', async () => {
    const { user } = await createUser();
    const { user: blocked } = await createUser({ status: 'BLOCKED' });

    const answers = await Promise.all(
      [user.email, 'nobody@example.com', blocked.email].map((email) => requestReset(email)),
    );
    for (const res of answers) {
      expect(res.status).toBe(202);
      expect(res.body).toEqual(answers[0].body);
    }
    expect(answers[0].body.message).toBe(
      'If an account exists for this email, a reset link has been sent.',
    );
  });

  it('US-07 S2: a registered email receives one reset link; an unknown email receives nothing', async () => {
    const { user } = await createUser();
    await requestReset(user.email).expect(202);
    await requestReset('nobody@example.com').expect(202);

    const mail = await latestMailTo(user.email);
    expect(mail?.subject).toBe('Reset your LearnPath password');
    expect(mail?.text).toMatch(/http:\/\/localhost:4200\/reset-password\/[A-Za-z0-9_-]{20,}/);

    await new Promise((resolve) => setTimeout(resolve, 300));
    const all = await listMail();
    expect(all.filter((m) => m.To.some((t) => t.Address === 'nobody@example.com'))).toHaveLength(0);
  });

  it('US-07 S3: a fresh link sets the new password and signs out every device', async () => {
    const { user, password } = await createUser();
    const login = await api.post('/api/auth/login').send({ email: user.email, password }).expect(200);
    const oldCookie = refreshCookieFrom(login)!;

    await requestReset(user.email).expect(202);
    const token = await tokenFromMail(user.email);

    await api.get(`/api/auth/password-reset/${token}`).expect(200, { valid: true });

    const res = await confirm(token);
    expect(res.status).toBe(204);
    expect(refreshCookieFrom(res)).toBeUndefined();

    await api.post('/api/auth/login').send({ email: user.email, password }).expect(401);
    await api.post('/api/auth/login').send({ email: user.email, password: 'newpass22' }).expect(200);
    await api.post('/api/auth/refresh').set('Cookie', oldCookie).expect(401);
  });

  it('US-07 S4: a used link shows "Link expired"', async () => {
    const { user } = await createUser();
    await requestReset(user.email).expect(202);
    const token = await tokenFromMail(user.email);
    await confirm(token).expect(204);

    const check = await api.get(`/api/auth/password-reset/${token}`);
    expect(check.status).toBe(410);
    expect(check.body.error).toEqual({ code: 'LINK_EXPIRED', message: 'Link expired' });
    await confirm(token, 'another33').expect(410);
  });

  it('US-07 S4: a link older than 1 hour shows "Link expired"', async () => {
    const { user } = await createUser();
    await requestReset(user.email).expect(202);
    const token = await tokenFromMail(user.email);

    advance(61 * MINUTE);
    await api.get(`/api/auth/password-reset/${token}`).expect(410);
    await confirm(token).expect(410);
  });

  it('US-07 S4: only the most recent link works', async () => {
    const { user } = await createUser();
    await requestReset(user.email).expect(202);
    const first = await tokenFromMail(user.email);
    await clearMail();
    await requestReset(user.email).expect(202);
    const second = await tokenFromMail(user.email);

    await confirm(first).expect(410);
    await confirm(second).expect(204);
  });

  it('US-07 S3: an invalid new password is refused and the link stays usable', async () => {
    const { user } = await createUser();
    await requestReset(user.email).expect(202);
    const token = await tokenFromMail(user.email);

    const res = await confirm(token, 'abcdefgh');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    await confirm(token, 'newpass22', 'newpass23').expect(400);
    await confirm(token).expect(204);
  });

  it('US-07 edge: an unknown token shows "Link expired"', async () => {
    await api.get('/api/auth/password-reset/does-not-exist').expect(410);
  });

  it('US-07 edge: resetting a blocked account does not unblock it', async () => {
    const { user } = await createUser({ status: 'BLOCKED' });
    await requestReset(user.email).expect(202);
    const token = await tokenFromMail(user.email);
    await confirm(token).expect(204);

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.status).toBe('BLOCKED');
    await api.post('/api/auth/login').send({ email: user.email, password: 'newpass22' }).expect(403);
  });
});
