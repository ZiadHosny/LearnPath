import { AppLogger } from '../../src/common/logging/app-logger.service.js';
import type { LogLevel } from '../../src/common/logging/logger.config.js';
import { api, currentApp, refreshCookieFrom } from '../helpers/app.js';
import { clearMail, latestMailTo } from '../helpers/mailpit.js';

// TS-03 US3: account events are logged with their story, and nothing secret reaches the logs.
describe('TS-03 US3 account event logs', () => {
  let lines: Array<{ line: string; level: LogLevel }>;

  beforeEach(async () => {
    // The email address is fixed, so an older reset email from a previous run must not be read.
    await clearMail();
    lines = [];
    currentApp()
      .get(AppLogger)
      .configure({ level: 'verbose', colors: false, format: 'pretty', sink: (line, level) => lines.push({ line, level }) });
  });

  afterEach(() => {
    currentApp().get(AppLogger).configure({ level: 'error', sink: undefined });
  });

  const event = (story: string, text: string) =>
    lines.find((l) => l.line.includes(`[${story}]`) && l.line.includes(text));

  it('logs every account event with its story, user id only, and no secrets', async () => {
    const email = 'logger.check@example.com';
    const password = 'abc12345';

    const reg = await api.post('/api/auth/register').send({ fullName: 'Log Check', email, password, confirmPassword: password }).expect(201);
    const userId: string = reg.body.user.id;
    const cookie = refreshCookieFrom(reg)!;
    const accessToken: string = reg.body.accessToken;

    await api.post('/api/auth/login').send({ email, password: 'wrongpass1' }).expect(401);
    const login = await api.post('/api/auth/login').send({ email, password }).expect(200);
    await api
      .post('/api/users/me/password')
      .set('Authorization', `Bearer ${login.body.accessToken}`)
      .send({ currentPassword: password, newPassword: 'newpass22', confirmPassword: 'newpass22' })
      .expect(204);
    await api.post('/api/auth/logout').set('Cookie', refreshCookieFrom(login)!).expect(204);
    await api.post('/api/auth/password-reset/request').send({ email }).expect(202);
    const mail = await latestMailTo(email);
    const resetToken = /reset-password\/([A-Za-z0-9_-]+)/.exec(mail!.text)![1];
    await api.get(`/api/auth/password-reset/${resetToken}`).expect(200);
    await api.post('/api/auth/password-reset/confirm').send({ token: resetToken, newPassword: 'fresh1234', confirmPassword: 'fresh1234' }).expect(204);

    const expected: Array<[string, string, LogLevel]> = [
      ['US-01', 'User registered', 'success'],
      ['US-02', 'Login failed', 'warn'],
      ['US-02', 'User logged in', 'success'],
      ['US-06', 'Password changed', 'success'],
      ['US-03', 'User logged out', 'success'],
      ['US-07', 'Password reset requested', 'log'],
      ['US-07', 'Password reset completed', 'success'],
    ];
    for (const [story, text, level] of expected) {
      const found = event(story, text);
      expect({ story, text, found: Boolean(found), level: found?.level }).toEqual({ story, text, found: true, level });
    }
    expect(event('US-01', 'User registered')!.line).toContain(`userId=${userId}`);

    // Nothing secret anywhere in the captured output.
    const all = lines.map((l) => l.line).join('\n');
    for (const secret of [password, 'wrongpass1', 'newpass22', 'fresh1234', email, resetToken, accessToken, cookie.split('=')[1]]) {
      expect({ secret: secret.slice(0, 6), leaked: all.includes(secret) }).toEqual({ secret: secret.slice(0, 6), leaked: false });
    }
  });

  it('writes exactly one request line per API call', async () => {
    await api.get('/api/users/me').expect(401);
    await api.post('/api/auth/login').send({ email: 'nobody@example.com', password: 'x1234567' }).expect(401);
    const requestLines = lines.filter((l) => l.line.includes('[HTTP]'));
    // Keep "METHOD path status"; drop the duration and fields such as requestId (TS-04).
    expect(requestLines.map((l) => l.line.replace(/^.*\[HTTP\] /, '').replace(/ \d+ms.*$/, ''))).toEqual([
      'GET /api/users/me 401',
      'POST /api/auth/login 401',
    ]);
  });
});
