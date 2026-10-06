import { api } from '../helpers/app.js';

// Contract §2 of specs/002-nestjs-migration/contracts/api-compatibility.md:
// framework defaults must not leak; responses keep the 001 error shape.
describe('API compatibility', () => {
  it('unknown routes return the uniform 404 body', async () => {
    const res = await api.get('/api/nope/at/all');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Not found' } });
  });

  it('a malformed JSON body returns 400 VALIDATION_ERROR', async () => {
    const res = await api
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"email": "a@x.com", ');
    expect(res.status).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' },
    });
  });

  it('a JSON body over 100 kb returns 413 VALIDATION_ERROR, as in 001', async () => {
    const res = await api
      .post('/api/auth/login')
      .send({ email: 'a@x.com', password: 'x'.repeat(110 * 1024) });
    expect(res.status).toBe(413);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Request body is not valid JSON' },
    });
  });

  // Nest answers every POST with 201 unless told otherwise; 001 used these codes.
  it('success codes match 001, not the framework default of 201 for POST', async () => {
    const reg = await api
      .post('/api/auth/register')
      .send({ fullName: 'Ali Hassan', email: 'ali@example.com', password: 'abc12345', confirmPassword: 'abc12345' });
    expect(reg.status).toBe(201);
    const cookie = (reg.headers['set-cookie'] as unknown as string[])[0].split(';')[0];
    const auth = `Bearer ${reg.body.accessToken}`;

    const login = await api.post('/api/auth/login').send({ email: 'ali@example.com', password: 'abc12345' });
    expect(login.status).toBe(200);
    expect((await api.post('/api/auth/refresh').set('Cookie', cookie)).status).toBe(200);
    expect((await api.post('/api/auth/password-reset/request').send({ email: 'ali@example.com' })).status).toBe(202);
    expect(
      (await api
        .post('/api/users/me/password')
        .set('Authorization', auth)
        .send({ currentPassword: 'abc12345', newPassword: 'abc12346', confirmPassword: 'abc12346' })).status,
    ).toBe(204);
    expect((await api.post('/api/auth/logout').set('Cookie', cookie)).status).toBe(204);
  });

  it('validation errors keep the 001 shape, not the framework default', async () => {
    const res = await api.post('/api/auth/register').send({});
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Some fields are invalid');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body).not.toHaveProperty('statusCode');
  });
});
