import { DAY, now } from '../../src/lib/clock.js';
import { randomToken, sha256Hex, signAccessToken } from '../../src/lib/tokens.js';
import { api } from '../helpers/app.js';
import { prisma } from '../helpers/db.js';
import { createUser } from '../helpers/factories.js';

// FR-005 / SC-006: logins made before the switch keep working afterwards. The token and the
// session row are created exactly the way the Express API created them, without calling the app.
describe('Logins from before the switch', () => {
  it('an access token signed before the switch is accepted', async () => {
    const { user } = await createUser();
    const session = await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: sha256Hex(randomToken()),
        expiresAt: new Date(now().getTime() + 7 * DAY),
      },
    });
    const token = signAccessToken({ sub: user.id, role: user.role, sid: session.id });

    const res = await api.get('/api/users/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(user.id);
  });

  it('a refresh session created before the switch keeps renewing', async () => {
    const { user } = await createUser();
    const refreshToken = randomToken();
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshTokenHash: sha256Hex(refreshToken),
        expiresAt: new Date(now().getTime() + 7 * DAY),
      },
    });

    const res = await api.post('/api/auth/refresh').set('Cookie', `lp_refresh=${refreshToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });
});
