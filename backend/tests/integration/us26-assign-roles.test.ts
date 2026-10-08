import { api } from '../helpers/app.js';
import { prisma } from '../helpers/db.js';
import { createUser, signedInAs } from '../helpers/factories.js';

describe('US-26 Assign roles', () => {
  describe('user list (minimal US-25 slice)', () => {
    it('US-26 S1: lists users 20 per page, newest first, with name, email and role only', async () => {
      const { auth, user: admin } = await signedInAs('ADMIN');
      for (let i = 0; i < 22; i++) {
        const { user } = await createUser({ fullName: `Person ${i}` });
        await prisma.user.update({ where: { id: user.id }, data: { createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)) } });
      }
      await prisma.user.update({ where: { id: admin.id }, data: { createdAt: new Date(Date.UTC(2025, 0, 1)) } });

      const page1 = await api.get('/api/admin/users').set('Authorization', auth);
      expect(page1.status).toBe(200);
      expect(page1.body).toMatchObject({ total: 23, page: 1, pageSize: 20 });
      expect(page1.body.items).toHaveLength(20);
      expect(page1.body.items[0].fullName).toBe('Person 21');
      expect(Object.keys(page1.body.items[0]).sort()).toEqual(['email', 'fullName', 'id', 'role']);

      const page2 = await api.get('/api/admin/users?page=2').set('Authorization', auth);
      expect(page2.body.items).toHaveLength(3);
      expect(page2.body.items.at(-1).id).toBe(admin.id);
    });

    it('US-26 S1: searches by part of the name or email, ignoring case', async () => {
      const { auth } = await signedInAs('ADMIN');
      await createUser({ fullName: 'Mona Saleh', email: 'mona@school.test' });
      await createUser({ fullName: 'Omar Fathy', email: 'omar@other.test' });

      const byName = await api.get('/api/admin/users?search=MONA').set('Authorization', auth);
      expect(byName.body.items.map((u: { fullName: string }) => u.fullName)).toEqual(['Mona Saleh']);

      const byEmail = await api.get('/api/admin/users?search=OTHER.test').set('Authorization', auth);
      expect(byEmail.body.items.map((u: { email: string }) => u.email)).toEqual(['omar@other.test']);
      expect(byEmail.body.total).toBe(1);
    });

    it('US-26 S5: only admins can see the list', async () => {
      await api.get('/api/admin/users').expect(401);
      const { auth } = await signedInAs('INSTRUCTOR');
      await api.get('/api/admin/users').set('Authorization', auth).expect(403);
    });
  });

  describe('role change', () => {
    it('US-26 S2/S3: saves the new role, and the user gets it at the next renewal', async () => {
      const { auth } = await signedInAs('ADMIN');
      const student = await signedInAs('STUDENT');

      const res = await api.patch(`/api/admin/users/${student.user.id}/role`).set('Authorization', auth).send({ role: 'INSTRUCTOR' });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ id: student.user.id, role: 'INSTRUCTOR' });

      const renewed = await api.post('/api/auth/refresh').set('Cookie', student.cookie).expect(200);
      expect(renewed.body.user.role).toBe('INSTRUCTOR');
    });

    it('US-26 S4: an admin cannot change their own role', async () => {
      const { auth, user } = await signedInAs('ADMIN');
      const res = await api.patch(`/api/admin/users/${user.id}/role`).set('Authorization', auth).send({ role: 'STUDENT' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_CHANGE_OWN_ROLE');
      expect((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).role).toBe('ADMIN');
    });

    it('refuses an unknown role and an unknown user', async () => {
      const { auth } = await signedInAs('ADMIN');
      const { user } = await createUser();
      await api.patch(`/api/admin/users/${user.id}/role`).set('Authorization', auth).send({ role: 'OWNER' }).expect(400);
      await api
        .patch('/api/admin/users/00000000-0000-4000-8000-000000000000/role')
        .set('Authorization', auth)
        .send({ role: 'INSTRUCTOR' })
        .expect(404);
      await api.patch('/api/admin/users/not-a-uuid/role').set('Authorization', auth).send({ role: 'INSTRUCTOR' }).expect(400);
    });

    it('US-26 S5: non-admins cannot change roles', async () => {
      const { auth } = await signedInAs('INSTRUCTOR');
      const { user } = await createUser();
      await api.patch(`/api/admin/users/${user.id}/role`).set('Authorization', auth).send({ role: 'ADMIN' }).expect(403);
    });

    it('edge: a blocked user stays blocked after a role change', async () => {
      const { auth } = await signedInAs('ADMIN');
      const { user } = await createUser({ status: 'BLOCKED' });
      await api.patch(`/api/admin/users/${user.id}/role`).set('Authorization', auth).send({ role: 'INSTRUCTOR' }).expect(200);
      const stored = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
      expect(stored).toMatchObject({ role: 'INSTRUCTOR', status: 'BLOCKED' });
    });
  });
});
