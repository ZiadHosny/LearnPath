import { api, refreshCookieFrom } from '../helpers/app.js';
import { prisma } from '../helpers/db.js';
import { createUser } from '../helpers/factories.js';

async function signIn(email: string, password: string) {
  const res = await api.post('/api/auth/login').send({ email, password }).expect(200);
  return refreshCookieFrom(res)!;
}

describe('US-03 Log out', () => {
  it('US-03 S1: logout ends this session, clears the cookie, and renewal stops working', async () => {
    const { user, password } = await createUser();
    const cookie = await signIn(user.email, password);

    const res = await api.post('/api/auth/logout').set('Cookie', cookie);
    expect(res.status).toBe(204);
    expect(refreshCookieFrom(res)).toBe('lp_refresh=');

    const session = await prisma.session.findFirstOrThrow({ where: { userId: user.id } });
    expect(session.endedAt).not.toBeNull();

    const renewed = await api.post('/api/auth/refresh').set('Cookie', cookie);
    expect(renewed.status).toBe(401);
    expect(renewed.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('US-03 S1: logout without a cookie still succeeds', async () => {
    await api.post('/api/auth/logout').expect(204);
  });

  it('US-03 S1: logout only affects the current device', async () => {
    const { user, password } = await createUser();
    const deviceA = await signIn(user.email, password);
    const deviceB = await signIn(user.email, password);

    await api.post('/api/auth/logout').set('Cookie', deviceA).expect(204);
    await api.post('/api/auth/refresh').set('Cookie', deviceB).expect(200);
  });
});
