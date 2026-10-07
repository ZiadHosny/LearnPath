import { advance, DAY, MINUTE } from '../../src/lib/clock.js';
import { api, refreshCookieFrom } from '../helpers/app.js';
import { prisma } from '../helpers/db.js';
import { createUser } from '../helpers/factories.js';

const login = (email: string, password: string) =>
  api.post('/api/auth/login').send({ email, password });

const refresh = (cookie?: string) => {
  const req = api.post('/api/auth/refresh');
  return cookie ? req.set('Cookie', cookie) : req;
};

describe('US-02 Log in', () => {
  it.each([
    ['S1', 'STUDENT'],
    ['S2', 'INSTRUCTOR'],
    ['S3', 'ADMIN'],
  ] as const)('US-02 %s: a %s logs in and gets their role back', async (_s, role) => {
    const { user, password } = await createUser({ role });
    const res = await login(user.email, password);

    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe(role);
    expect(res.body.accessToken).toEqual(expect.any(String));
    expect(refreshCookieFrom(res)).toBeDefined();
  });

  it('US-02 S4: wrong password and unknown email get the same generic answer', async () => {
    const { user } = await createUser();
    const wrong = await login(user.email, 'wrongpass1');
    const unknown = await login('nobody@example.com', 'wrongpass1');

    for (const res of [wrong, unknown]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
      });
    }
  });

  it('US-02 S5: five failures in 15 minutes block the email, even with the right password', async () => {
    const { user, password } = await createUser();
    for (let i = 0; i < 5; i++) {
      advance(MINUTE);
      await login(user.email, 'wrongpass1').expect(401);
    }

    const blocked = await login(user.email, password);
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_ATTEMPTS');
    expect(Number(blocked.headers['retry-after'])).toBe(15 * 60);

    // Attempts during the block are not recorded and do not extend it.
    advance(10 * MINUTE);
    await login(user.email, 'wrongpass1').expect(429);
    advance(5 * MINUTE);
    await login(user.email, password).expect(200);
  });

  it('US-02 S5: a successful login clears the failure count', async () => {
    const { user, password } = await createUser();
    for (let i = 0; i < 4; i++) await login(user.email, 'wrongpass1').expect(401);
    await login(user.email, password).expect(200);
    for (let i = 0; i < 4; i++) await login(user.email, 'wrongpass1').expect(401);
    await login(user.email, password).expect(200);
  });

  it('US-02 S5: unknown emails are blocked the same way', async () => {
    for (let i = 0; i < 5; i++) await login('ghost@example.com', 'wrongpass1').expect(401);
    await login('ghost@example.com', 'wrongpass1').expect(429);
  });

  it('US-02 S6: the user is recognised with the access token and can renew it', async () => {
    const { user, password } = await createUser();
    const res = await login(user.email, password);

    const me = await api.get('/api/users/me').set('Authorization', `Bearer ${res.body.accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(user.email);

    const renewed = await refresh(refreshCookieFrom(res));
    expect(renewed.status).toBe(200);
    expect(renewed.body.accessToken).toEqual(expect.any(String));
    expect(renewed.body.user.id).toBe(user.id);
  });

  it('US-02 S7: a Blocked account is refused only after a correct password', async () => {
    const { user, password } = await createUser({ status: 'BLOCKED' });

    const right = await login(user.email, password);
    expect(right.status).toBe(403);
    expect(right.body.error).toEqual({ code: 'ACCOUNT_BLOCKED', message: 'Account blocked' });
    expect(refreshCookieFrom(right)).toBeUndefined();
    expect(await prisma.session.count()).toBe(0);

    const wrong = await login(user.email, 'wrongpass1');
    expect(wrong.status).toBe(401);
    expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('US-02 S8: a user blocked after login is refused at the next renewal', async () => {
    const { user, password } = await createUser();
    const cookie = refreshCookieFrom(await login(user.email, password));
    await prisma.user.update({ where: { id: user.id }, data: { status: 'BLOCKED' } });

    const res = await refresh(cookie);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_BLOCKED');
    expect(refreshCookieFrom(res)).toBe('lp_refresh=');

    const session = await prisma.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.endedAt).not.toBeNull();
  });

  it('US-02 FR-011: access token lasts 15 minutes, renewal works until 7 days after sign-in', async () => {
    const { user, password } = await createUser();
    const res = await login(user.email, password);
    const cookie = refreshCookieFrom(res);

    advance(16 * MINUTE);
    await api
      .get('/api/users/me')
      .set('Authorization', `Bearer ${res.body.accessToken}`)
      .expect(401)
      .expect((r) => expect(r.body.error.code).toBe('UNAUTHENTICATED'));
    await refresh(cookie).expect(200);

    advance(7 * DAY);
    const expired = await refresh(cookie);
    expect(expired.status).toBe(401);
    expect(expired.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('US-02 FR-011: renewal without a cookie or with an unknown cookie is refused', async () => {
    await refresh().expect(401);
    await refresh('lp_refresh=not-a-real-token').expect(401);
  });

  it('US-02 FR-011a: renewal carries the current role', async () => {
    const { user, password } = await createUser({ role: 'STUDENT' });
    const cookie = refreshCookieFrom(await login(user.email, password));
    await prisma.user.update({ where: { id: user.id }, data: { role: 'INSTRUCTOR' } });

    const res = await refresh(cookie);
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe('INSTRUCTOR');

    const payload = JSON.parse(Buffer.from(res.body.accessToken.split('.')[1], 'base64url').toString());
    expect(payload.role).toBe('INSTRUCTOR');
  });

  it('US-02 edge: two renewals at the same moment both succeed', async () => {
    const { user, password } = await createUser();
    const cookie = refreshCookieFrom(await login(user.email, password));
    const [a, b] = await Promise.all([refresh(cookie), refresh(cookie)]);
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
  });
});
