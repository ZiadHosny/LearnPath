import { api, refreshCookieFrom } from '../helpers/app.js';
import { createUser } from '../helpers/factories.js';

async function signIn(email: string, password: string) {
  const res = await api.post('/api/auth/login').send({ email, password }).expect(200);
  return { cookie: refreshCookieFrom(res)!, auth: `Bearer ${res.body.accessToken}` };
}

async function twoDevices() {
  const { user, password } = await createUser({ password: 'oldpass11' });
  const a = await signIn(user.email, password);
  const b = await signIn(user.email, password);
  return { user, password, a, b };
}

const change = (auth: string, body: Record<string, string>) =>
  api.post('/api/users/me/password').set('Authorization', auth).send(body);

describe('US-06 Change password', () => {
  it('US-06 S1: the password changes, this device stays signed in, other devices are signed out', async () => {
    const { user, a, b } = await twoDevices();

    const res = await change(a.auth, {
      currentPassword: 'oldpass11',
      newPassword: 'newpass22',
      confirmPassword: 'newpass22',
    });
    expect(res.status).toBe(204);

    await api.post('/api/auth/login').send({ email: user.email, password: 'oldpass11' }).expect(401);
    await api.post('/api/auth/login').send({ email: user.email, password: 'newpass22' }).expect(200);

    await api.post('/api/auth/refresh').set('Cookie', a.cookie).expect(200);
    const other = await api.post('/api/auth/refresh').set('Cookie', b.cookie);
    expect(other.status).toBe(401);
    expect(other.body.error.code).toBe('SESSION_EXPIRED');
  });

  it('US-06 S2: a wrong current password changes nothing', async () => {
    const { user, a, b } = await twoDevices();

    const res = await change(a.auth, {
      currentPassword: 'wrongpass1',
      newPassword: 'newpass22',
      confirmPassword: 'newpass22',
    });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_CURRENT_PASSWORD');

    await api.post('/api/auth/login').send({ email: user.email, password: 'oldpass11' }).expect(200);
    await api.post('/api/auth/refresh').set('Cookie', b.cookie).expect(200);
  });

  it.each([
    ['breaks the password rule', { newPassword: 'abcdefgh', confirmPassword: 'abcdefgh' }],
    ['does not match the confirmation', { newPassword: 'newpass22', confirmPassword: 'newpass23' }],
  ])('US-06 S3: a new password that %s is refused', async (_label, body) => {
    const { user, a } = await twoDevices();
    const res = await change(a.auth, { currentPassword: 'oldpass11', ...body });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    await api.post('/api/auth/login').send({ email: user.email, password: 'oldpass11' }).expect(200);
  });

  it('US-06: changing the password requires a login', async () => {
    await api
      .post('/api/users/me/password')
      .send({ currentPassword: 'x', newPassword: 'newpass22', confirmPassword: 'newpass22' })
      .expect(401);
  });
});
