import { api } from '../helpers/app.js';
import { prisma } from '../helpers/db.js';
import { createCategory, createCourse, signedInAs } from '../helpers/factories.js';

describe('US-27 Manage categories', () => {
  it('US-27 S1: an admin adds a category and everyone signed in sees the list sorted by name', async () => {
    const { auth } = await signedInAs('ADMIN');
    for (const name of ['Web Development', 'Design', 'Marketing']) {
      const res = await api.post('/api/categories').set('Authorization', auth).send({ name: `  ${name} ` });
      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({ id: expect.any(String), name, courseCount: 0 });
    }

    const student = await signedInAs('STUDENT');
    const list = await api.get('/api/categories').set('Authorization', student.auth);
    expect(list.status).toBe(200);
    expect(list.body.map((c: { name: string }) => c.name)).toEqual(['Design', 'Marketing', 'Web Development']);
  });

  it('US-27: the list shows how many courses use each category', async () => {
    const { auth } = await signedInAs('ADMIN');
    const { user: teacher } = await signedInAs('INSTRUCTOR');
    const design = await createCategory('Design');
    await createCategory('Art');
    await createCourse({ ownerId: teacher.id, categoryId: design.id });
    await createCourse({ ownerId: teacher.id, categoryId: design.id, status: 'PUBLISHED' });

    const list = await api.get('/api/categories').set('Authorization', auth);
    expect(list.body).toEqual([
      { id: expect.any(String), name: 'Art', courseCount: 0 },
      { id: design.id, name: 'Design', courseCount: 2 },
    ]);
  });

  it('US-27 S2: a name that already exists (any case or spaces) is refused', async () => {
    const { auth } = await signedInAs('ADMIN');
    await createCategory('Web Development');
    const res = await api.post('/api/categories').set('Authorization', auth).send({ name: ' web development ' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'CATEGORY_EXISTS', message: 'Category name already exists' });
    expect(await prisma.category.count()).toBe(1);
  });

  it('US-27: names must be 2–60 characters', async () => {
    const { auth } = await signedInAs('ADMIN');
    for (const name of ['A', ' ', 'x'.repeat(61)]) {
      const res = await api.post('/api/categories').set('Authorization', auth).send({ name });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.details).toEqual([
        { field: 'name', message: 'Category name must be 2–60 characters' },
      ]);
    }
  });

  it('US-27 S3: an admin renames a category', async () => {
    const { auth } = await signedInAs('ADMIN');
    const category = await createCategory('Web Dev');
    const res = await api.patch(`/api/categories/${category.id}`).set('Authorization', auth).send({ name: 'Web Development' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: category.id, name: 'Web Development' });

    // Changing only the case of its own name is allowed.
    const recase = await api.patch(`/api/categories/${category.id}`).set('Authorization', auth).send({ name: 'web development' });
    expect(recase.status).toBe(200);
    expect(recase.body.name).toBe('web development');
  });

  it('US-27 S2: renaming to another category\'s name is refused', async () => {
    const { auth } = await signedInAs('ADMIN');
    await createCategory('Design');
    const other = await createCategory('Art');
    const res = await api.patch(`/api/categories/${other.id}`).set('Authorization', auth).send({ name: 'DESIGN' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CATEGORY_EXISTS');
  });

  it('US-27: renaming or deleting an unknown category returns 404', async () => {
    const { auth } = await signedInAs('ADMIN');
    const id = '00000000-0000-4000-8000-000000000000';
    expect((await api.patch(`/api/categories/${id}`).set('Authorization', auth).send({ name: 'New' })).status).toBe(404);
    expect((await api.delete(`/api/categories/${id}`).set('Authorization', auth)).status).toBe(404);
    expect((await api.delete('/api/categories/not-a-uuid').set('Authorization', auth)).status).toBe(400);
  });

  it('US-27 S4: an unused category is deleted', async () => {
    const { auth } = await signedInAs('ADMIN');
    const category = await createCategory('Old');
    const res = await api.delete(`/api/categories/${category.id}`).set('Authorization', auth);
    expect(res.status).toBe(204);
    expect(await prisma.category.count()).toBe(0);
  });

  it('US-27 S5: a category used by courses cannot be deleted and the message says how many', async () => {
    const { auth } = await signedInAs('ADMIN');
    const { user: teacher } = await signedInAs('INSTRUCTOR');
    const category = await createCategory('Design');
    for (let i = 0; i < 3; i++) await createCourse({ ownerId: teacher.id, categoryId: category.id });

    const res = await api.delete(`/api/categories/${category.id}`).set('Authorization', auth);
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({
      code: 'CATEGORY_IN_USE',
      message: 'This category is used by 3 courses and cannot be deleted',
    });

    const arabic = await api.delete(`/api/categories/${category.id}`).set('Authorization', auth).set('Accept-Language', 'ar');
    expect(arabic.body.error.message).toContain('3');
    expect(await prisma.category.count()).toBe(1);
  });

  it('US-27 S5: one course in use reads "1 course"', async () => {
    const { auth } = await signedInAs('ADMIN');
    const { user: teacher } = await signedInAs('INSTRUCTOR');
    const category = await createCategory('Design');
    await createCourse({ ownerId: teacher.id, categoryId: category.id });
    const res = await api.delete(`/api/categories/${category.id}`).set('Authorization', auth);
    expect(res.status).toBe(409);
    expect(res.body.error.message).toBe('This category is used by 1 course and cannot be deleted');
  });

  it('US-27: only admins can add, rename or delete', async () => {
    const category = await createCategory('Design');
    for (const role of ['STUDENT', 'INSTRUCTOR'] as const) {
      const { auth } = await signedInAs(role);
      expect((await api.post('/api/categories').set('Authorization', auth).send({ name: 'New' })).status).toBe(403);
      expect((await api.patch(`/api/categories/${category.id}`).set('Authorization', auth).send({ name: 'New' })).status).toBe(403);
      expect((await api.delete(`/api/categories/${category.id}`).set('Authorization', auth)).status).toBe(403);
    }
  });

  it('US-27: guests cannot read categories', async () => {
    expect((await api.get('/api/categories')).status).toBe(401);
  });
});
