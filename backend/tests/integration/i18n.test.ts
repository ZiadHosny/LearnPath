import { ar } from '../../src/i18n/locales/ar.js';
import { api } from '../helpers/app.js';
import { createUser } from '../helpers/factories.js';

// US-30 S8 / FR-004 and FR-006 (API side).
describe('US-30 API in the requested language', () => {
  it('answers errors in Arabic for Accept-Language: ar, with the same code', async () => {
    const res = await api.post('/api/auth/login').set('Accept-Language', 'ar').send({ email: 'x@y.com', password: 'wrong1234' });
    expect(res.status).toBe(401);
    expect(res.body.error).toEqual({ code: 'INVALID_CREDENTIALS', message: ar.errors.INVALID_CREDENTIALS });
    expect(res.headers['content-language']).toBe('ar');
  });

  it('answers in English when no supported language is asked for', async () => {
    const res = await api.post('/api/auth/login').set('Accept-Language', 'de').send({ email: 'x@y.com', password: 'wrong1234' });
    expect(res.body.error.message).toBe('Invalid email or password');
    expect(res.headers['content-language']).toBe('en');
  });

  it('translates validation details', async () => {
    const res = await api
      .post('/api/auth/register')
      .set('Accept-Language', 'ar')
      .send({ fullName: 'Ali Hassan', email: 'ali@example.com', password: 'abc12345', confirmPassword: 'nope1234' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe(ar.errors.VALIDATION_ERROR);
    expect(res.body.error.details).toEqual([{ field: 'confirmPassword', message: ar.validation.passwordsMismatch }]);
  });

  it('translates success messages', async () => {
    const res = await api.post('/api/auth/password-reset/request').set('Accept-Language', 'ar').send({ email: 'a@b.com' });
    expect(res.status).toBe(202);
    expect(res.body.message).toBe(ar.messages.resetLinkSent);
  });
});

describe('US-30 S4 / FR-006 language saved on the account', () => {
  async function signedIn() {
    const { user, password } = await createUser();
    const res = await api.post('/api/auth/login').send({ email: user.email, password }).expect(200);
    return { user, password, auth: `Bearer ${res.body.accessToken}` };
  }

  it('starts empty, can be saved, and comes back at the next sign-in', async () => {
    const { user, password, auth } = await signedIn();
    expect((await api.get('/api/users/me').set('Authorization', auth)).body.language).toBeNull();

    const saved = await api.patch('/api/users/me').set('Authorization', auth).send({ language: 'ar' });
    expect(saved.status).toBe(200);
    expect(saved.body.language).toBe('ar');

    const again = await api.post('/api/auth/login').send({ email: user.email, password }).expect(200);
    expect(again.body.user.language).toBe('ar');
  });

  it('refuses a language that is not in the list (US-31 S3)', async () => {
    const { auth } = await signedIn();
    const res = await api.patch('/api/users/me').set('Authorization', auth).send({ language: 'xx' });
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe('language');
  });

  it('can be cleared with null', async () => {
    const { auth } = await signedIn();
    await api.patch('/api/users/me').set('Authorization', auth).send({ language: 'ar' }).expect(200);
    const cleared = await api.patch('/api/users/me').set('Authorization', auth).send({ language: null });
    expect(cleared.body.language).toBeNull();
  });
});
