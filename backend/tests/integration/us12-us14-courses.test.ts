import fs from 'node:fs';
import path from 'node:path';
import { thumbnailsDir } from '../../src/config/paths.js';
import { PUBLIC_COURSE_WHERE } from '../../src/modules/courses/course-visibility.js';
import { api } from '../helpers/app.js';
import { prisma } from '../helpers/db.js';
import { createCategory, createCourse, signedInAs } from '../helpers/factories.js';

const MB = 1024 * 1024;
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64)]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64)]);
const oversizeJpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(2 * MB - 3)]);
const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(64)]);

const fileOf = (url: string) => path.join(thumbnailsDir, path.basename(url));

async function validCourse() {
  const category = await createCategory('Web Development');
  return {
    title: 'Angular from zero',
    shortDescription: 'Build real apps with Angular',
    categoryId: category.id,
    level: 'BEGINNER',
  };
}

describe('US-12 Create a course (draft)', () => {
  it('US-12 S1: an instructor creates a course; it is a Draft owned by them', async () => {
    const { auth, user } = await signedInAs('INSTRUCTOR');
    const body = await validCourse();
    const res = await api.post('/api/courses').set('Authorization', auth).send({ ...body, title: '  Angular from zero ' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(String),
      title: 'Angular from zero',
      shortDescription: 'Build real apps with Angular',
      description: null,
      learningOutcomes: [],
      level: 'BEGINNER',
      category: { id: body.categoryId, name: 'Web Development' },
      thumbnailUrl: null,
      status: 'DRAFT',
      ownerId: user.id,
    });
    const saved = await prisma.course.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(saved).toMatchObject({ status: 'DRAFT', ownerId: user.id });
  });

  it('US-12 S3: optional description and "what you will learn" items are saved; blank items are dropped', async () => {
    const { auth } = await signedInAs('INSTRUCTOR');
    const res = await api
      .post('/api/courses')
      .set('Authorization', auth)
      .send({
        ...(await validCourse()),
        description: '  A long description  ',
        learningOutcomes: [' Components ', '', '   ', 'Signals'],
      });
    expect(res.status).toBe(201);
    expect(res.body.description).toBe('A long description');
    expect(res.body.learningOutcomes).toEqual(['Components', 'Signals']);
  });

  it('US-12 S2: missing or too-long fields are refused with field errors and nothing is saved', async () => {
    const { auth } = await signedInAs('INSTRUCTOR');
    const base = await validCourse();
    const cases: Array<[Record<string, unknown>, string, string]> = [
      [{ title: '' }, 'title', 'Title must be 1–120 characters'],
      [{ title: 'x'.repeat(121) }, 'title', 'Title must be 1–120 characters'],
      [{ shortDescription: '   ' }, 'shortDescription', 'Short description must be 1–250 characters'],
      [{ shortDescription: 'x'.repeat(251) }, 'shortDescription', 'Short description must be 1–250 characters'],
      [{ description: 'x'.repeat(5001) }, 'description', 'Description must be 5,000 characters or fewer'],
      [{ learningOutcomes: Array.from({ length: 11 }, (_, i) => `Item ${i}`) }, 'learningOutcomes', 'Add at most 10 learning outcomes'],
      [{ learningOutcomes: ['x'.repeat(121)] }, 'learningOutcomes', 'Each learning outcome must be 120 characters or fewer'],
      [{ level: 'EXPERT' }, 'level', 'Choose Beginner, Intermediate or Advanced'],
      [{ categoryId: 'nope' }, 'categoryId', 'Choose an existing category'],
    ];
    for (const [change, field, message] of cases) {
      const res = await api.post('/api/courses').set('Authorization', auth).send({ ...base, ...change });
      expect(res.status, JSON.stringify(change).slice(0, 60)).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toContainEqual({ field, message });
    }
    const { title: _title, ...noTitle } = base;
    const missing = await api.post('/api/courses').set('Authorization', auth).send(noTitle);
    expect(missing.body.error.details).toContainEqual({ field: 'title', message: 'Title must be 1–120 characters' });
    expect(await prisma.course.count()).toBe(0);
  });

  it('US-12 S2: an unknown category is refused as a field error', async () => {
    const { auth } = await signedInAs('INSTRUCTOR');
    const res = await api
      .post('/api/courses')
      .set('Authorization', auth)
      .send({ ...(await validCourse()), categoryId: '00000000-0000-4000-8000-000000000000' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual([{ field: 'categoryId', message: 'Choose an existing category' }]);
    expect(await prisma.course.count()).toBe(0);
  });

  it('US-12 S5: students and guests cannot create courses', async () => {
    const body = await validCourse();
    const student = await signedInAs('STUDENT');
    expect((await api.post('/api/courses').set('Authorization', student.auth).send(body)).status).toBe(403);
    expect((await api.post('/api/courses').send(body)).status).toBe(401);
    expect(await prisma.course.count()).toBe(0);
  });

  it('US-12 S4: only Published courses match the public-visibility rule', async () => {
    const { user } = await signedInAs('INSTRUCTOR');
    await createCourse({ ownerId: user.id, title: 'Draft one', status: 'DRAFT' });
    await createCourse({ ownerId: user.id, title: 'Archived one', status: 'ARCHIVED' });
    await createCourse({ ownerId: user.id, title: 'Live one', status: 'PUBLISHED' });

    const visible = await prisma.course.findMany({ where: PUBLIC_COURSE_WHERE });
    expect(visible.map((c) => c.title)).toEqual(['Live one']);
  });
});

describe('US-12 S3 / US-14 S5 Course thumbnail', () => {
  const upload = (auth: string, id: string, file: Buffer, name: string) =>
    api.put(`/api/courses/${id}/thumbnail`).set('Authorization', auth).attach('thumbnail', file, name);

  it('a JPG or PNG up to 2 MB is saved and served; a new one removes the old one', async () => {
    const { auth, user } = await signedInAs('INSTRUCTOR');
    const course = await createCourse({ ownerId: user.id });

    const first = await upload(auth, course.id, png, 'cover.png');
    expect(first.status).toBe(200);
    expect(first.body.thumbnailUrl).toMatch(/^\/uploads\/thumbnails\/.+\.png$/);
    await api.get(first.body.thumbnailUrl).expect(200);

    const second = await upload(auth, course.id, jpeg, 'cover.jpg');
    expect(second.body.thumbnailUrl).toMatch(/\.jpg$/);
    expect(fs.existsSync(fileOf(second.body.thumbnailUrl))).toBe(true);
    expect(fs.existsSync(fileOf(first.body.thumbnailUrl))).toBe(false);
  });

  it('a file over 2 MB (413) or of another type (415) is refused and the old one kept', async () => {
    const { auth, user } = await signedInAs('INSTRUCTOR');
    const course = await createCourse({ ownerId: user.id });
    const original = await upload(auth, course.id, png, 'cover.png');

    const tooBig = await upload(auth, course.id, oversizeJpeg, 'big.jpg');
    expect(tooBig.status).toBe(413);
    expect(tooBig.body.error.code).toBe('FILE_TOO_LARGE');
    const wrongType = await upload(auth, course.id, gif, 'cover.png');
    expect(wrongType.status).toBe(415);
    expect(wrongType.body.error.code).toBe('UNSUPPORTED_FILE_TYPE');

    const now = await api.get(`/api/courses/${course.id}`).set('Authorization', auth);
    expect(now.body.thumbnailUrl).toBe(original.body.thumbnailUrl);
    expect(fs.existsSync(fileOf(original.body.thumbnailUrl))).toBe(true);
  });

  it('no file is a field error; other instructors are refused', async () => {
    const { auth, user } = await signedInAs('INSTRUCTOR');
    const course = await createCourse({ ownerId: user.id });
    const none = await api.put(`/api/courses/${course.id}/thumbnail`).set('Authorization', auth);
    expect(none.status).toBe(400);
    expect(none.body.error.details).toEqual([{ field: 'thumbnail', message: 'Choose an image to upload' }]);

    const other = await signedInAs('INSTRUCTOR');
    expect((await upload(other.auth, course.id, png, 'cover.png')).status).toBe(403);
  });
});

describe('US-13 List my courses', () => {
  it('US-13 S1/S2: shows only my courses, newest change first, with counts', async () => {
    const me = await signedInAs('INSTRUCTOR');
    const other = await signedInAs('INSTRUCTOR');
    const older = await createCourse({ ownerId: me.user.id, title: 'Older' });
    const newer = await createCourse({ ownerId: me.user.id, title: 'Newer', status: 'PUBLISHED' });
    await createCourse({ ownerId: other.user.id, title: 'Not mine' });
    await prisma.course.update({ where: { id: older.id }, data: { updatedAt: new Date(Date.UTC(2026, 0, 1)) } });
    await prisma.course.update({ where: { id: newer.id }, data: { updatedAt: new Date(Date.UTC(2026, 5, 1)) } });

    const res = await api.get('/api/courses/mine').set('Authorization', me.auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: newer.id,
        title: 'Newer',
        status: 'PUBLISHED',
        thumbnailUrl: null,
        lessonCount: 0,
        studentCount: 0,
        updatedAt: '2026-06-01T00:00:00.000Z',
      },
      expect.objectContaining({ id: older.id, title: 'Older', status: 'DRAFT' }),
    ]);
  });

  it('US-13 S3: an instructor with no courses gets an empty list', async () => {
    const { auth } = await signedInAs('INSTRUCTOR');
    const res = await api.get('/api/courses/mine').set('Authorization', auth);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('US-13: students cannot open My Courses', async () => {
    const { auth } = await signedInAs('STUDENT');
    expect((await api.get('/api/courses/mine').set('Authorization', auth)).status).toBe(403);
  });
});

describe('US-14 Edit course details', () => {
  it('US-14 S1: the owner opens and edits the course; the update time moves forward', async () => {
    const { auth, user } = await signedInAs('INSTRUCTOR');
    const course = await createCourse({ ownerId: user.id, title: 'Old title' });
    const art = await createCategory('Art');

    const opened = await api.get(`/api/courses/${course.id}`).set('Authorization', auth);
    expect(opened.status).toBe(200);
    expect(opened.body.title).toBe('Old title');

    const res = await api
      .patch(`/api/courses/${course.id}`)
      .set('Authorization', auth)
      .send({ title: 'New title', level: 'ADVANCED', categoryId: art.id, learningOutcomes: ['One'], description: '' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      title: 'New title',
      level: 'ADVANCED',
      category: { id: art.id, name: 'Art' },
      learningOutcomes: ['One'],
      description: null,
      status: 'DRAFT',
    });
    expect(new Date(res.body.updatedAt).getTime()).toBeGreaterThan(course.updatedAt.getTime());
  });

  it('US-14 S2: invalid values get the same field errors as creation', async () => {
    const { auth, user } = await signedInAs('INSTRUCTOR');
    const course = await createCourse({ ownerId: user.id });
    const res = await api.patch(`/api/courses/${course.id}`).set('Authorization', auth).send({ title: '', level: 'EXPERT' });
    expect(res.status).toBe(400);
    expect(res.body.error.details).toEqual(
      expect.arrayContaining([
        { field: 'title', message: 'Title must be 1–120 characters' },
        { field: 'level', message: 'Choose Beginner, Intermediate or Advanced' },
      ]),
    );
    const unknownCategory = await api
      .patch(`/api/courses/${course.id}`)
      .set('Authorization', auth)
      .send({ categoryId: '00000000-0000-4000-8000-000000000000' });
    expect(unknownCategory.status).toBe(400);
    expect((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).title).toBe('Test course');
  });

  it('US-14: the status cannot be changed by editing details', async () => {
    const { auth, user } = await signedInAs('INSTRUCTOR');
    const course = await createCourse({ ownerId: user.id });
    const res = await api.patch(`/api/courses/${course.id}`).set('Authorization', auth).send({ status: 'PUBLISHED' });
    expect(res.status).toBe(400);
    expect((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).status).toBe('DRAFT');
  });

  it('US-14 S3: an admin can open and edit any course', async () => {
    const { user: owner } = await signedInAs('INSTRUCTOR');
    const course = await createCourse({ ownerId: owner.id });
    const admin = await signedInAs('ADMIN');
    expect((await api.get(`/api/courses/${course.id}`).set('Authorization', admin.auth)).status).toBe(200);
    const res = await api.patch(`/api/courses/${course.id}`).set('Authorization', admin.auth).send({ title: 'Fixed by admin' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ title: 'Fixed by admin', ownerId: owner.id });
  });

  it('US-14 S4: other instructors and students are refused; unknown ids give 404', async () => {
    const { user: owner } = await signedInAs('INSTRUCTOR');
    const course = await createCourse({ ownerId: owner.id });
    for (const role of ['INSTRUCTOR', 'STUDENT'] as const) {
      const { auth } = await signedInAs(role);
      expect((await api.get(`/api/courses/${course.id}`).set('Authorization', auth)).status).toBe(403);
      expect((await api.patch(`/api/courses/${course.id}`).set('Authorization', auth).send({ title: 'Hacked' })).status).toBe(403);
    }
    const { auth } = await signedInAs('INSTRUCTOR');
    const unknown = '00000000-0000-4000-8000-000000000000';
    expect((await api.get(`/api/courses/${unknown}`).set('Authorization', auth)).status).toBe(404);
    expect((await api.patch(`/api/courses/${unknown}`).set('Authorization', auth).send({ title: 'X' })).status).toBe(404);
    expect((await api.get('/api/courses/not-a-uuid').set('Authorization', auth)).status).toBe(400);
    expect((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).title).toBe('Test course');
  });
});
