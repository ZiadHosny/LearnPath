import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { avatarsDir } from '../../src/config/paths.js';
import { api } from '../helpers/app.js';
import { prisma } from '../helpers/db.js';
import { createUser } from '../helpers/factories.js';

const MB = 1024 * 1024;
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
const oversizeJpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2 * MB - 3)]);
const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(64)]);

async function signedIn() {
  const { user, password } = await createUser({ fullName: 'Ali Hassan' });
  const res = await api.post('/api/auth/login').send({ email: user.email, password }).expect(200);
  return { user, auth: `Bearer ${res.body.accessToken}` };
}

const upload = (auth: string, file: Buffer, filename: string) =>
  api.put('/api/users/me/photo').set('Authorization', auth).attach('photo', file, filename);

const fileOf = (photoUrl: string) => path.join(avatarsDir, path.basename(photoUrl));

describe('US-05 View and edit my profile', () => {
  it('US-05 S1: the profile shows name, email, photo and bio', async () => {
    const { user, auth } = await signedIn();
    const res = await api.get('/api/users/me').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ fullName: 'Ali Hassan', email: user.email, photoUrl: null, bio: null });
  });

  it('US-05 S1: email cannot be changed', async () => {
    const { user, auth } = await signedIn();
    const res = await api
      .patch('/api/users/me')
      .set('Authorization', auth)
      .send({ fullName: 'New Name', email: 'new@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');

    const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(stored.email).toBe(user.email);
    expect(stored.fullName).toBe('Ali Hassan');
  });

  it('US-05 S2: name and bio changes are saved', async () => {
    const { auth } = await signedIn();
    const res = await api
      .patch('/api/users/me')
      .set('Authorization', auth)
      .send({ fullName: '  Mona Ali  ', bio: 'I teach maths.' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ fullName: 'Mona Ali', bio: 'I teach maths.' });

    const again = await api.get('/api/users/me').set('Authorization', auth);
    expect(again.body).toMatchObject({ fullName: 'Mona Ali', bio: 'I teach maths.' });

    const cleared = await api.patch('/api/users/me').set('Authorization', auth).send({ bio: null });
    expect(cleared.body.bio).toBeNull();
  });

  it.each([
    ['bio over 500 characters', { bio: 'x'.repeat(501) }, 'bio'],
    ['name under 2 characters', { fullName: 'A' }, 'fullName'],
  ])('US-05 S2: invalid changes are refused (%s)', async (_label, body, field) => {
    const { auth } = await signedIn();
    const res = await api.patch('/api/users/me').set('Authorization', auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe(field);
  });

  it('US-05 S3: a JPG or PNG photo up to 2 MB is saved and served; the old one is removed', async () => {
    const { auth } = await signedIn();

    const first = await upload(auth, png, 'me.png');
    expect(first.status).toBe(200);
    expect(first.body.photoUrl).toMatch(/^\/uploads\/avatars\/.+\.png$/);
    await api.get(first.body.photoUrl).expect(200);
    expect(fs.existsSync(fileOf(first.body.photoUrl))).toBe(true);

    const second = await upload(auth, jpeg, 'me.jpg');
    expect(second.status).toBe(200);
    expect(second.body.photoUrl).toMatch(/\.jpg$/);
    expect(fs.existsSync(fileOf(second.body.photoUrl))).toBe(true);
    expect(fs.existsSync(fileOf(first.body.photoUrl))).toBe(false);
  });

  it('US-05 S4: a photo over 2 MB or of another type is refused and the old photo is kept', async () => {
    const { auth } = await signedIn();
    const original = await upload(auth, png, 'me.png');

    const tooBig = await upload(auth, oversizeJpeg, 'big.jpg');
    expect(tooBig.status).toBe(413);
    expect(tooBig.body.error.code).toBe('FILE_TOO_LARGE');

    const wrongType = await upload(auth, gif, 'photo.png');
    expect(wrongType.status).toBe(415);
    expect(wrongType.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');

    const me = await api.get('/api/users/me').set('Authorization', auth);
    expect(me.body.photoUrl).toBe(original.body.photoUrl);
    expect(fs.existsSync(fileOf(original.body.photoUrl))).toBe(true);
  });

  it('US-05: profile endpoints require a login', async () => {
    await api.patch('/api/users/me').send({ bio: 'x' }).expect(401);
    await api.put('/api/users/me/photo').attach('photo', png, 'me.png').expect(401);
  });
});
