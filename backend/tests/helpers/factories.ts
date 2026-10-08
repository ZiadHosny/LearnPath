import { randomUUID } from 'node:crypto';
import type { CourseStatus, Role, UserStatus } from '../../src/generated/prisma/enums.js';
import { hashPassword } from '../../src/lib/password.js';
import { prisma } from './db.js';

export interface CreateUserInput {
  email?: string;
  password?: string;
  fullName?: string;
  role?: Role;
  status?: UserStatus;
}

export async function createUser(input: CreateUserInput = {}) {
  const password = input.password ?? 'Passw0rd1';
  const user = await prisma.user.create({
    data: {
      email: input.email ?? `user-${randomUUID().slice(0, 8)}@example.com`,
      fullName: input.fullName ?? 'Test User',
      role: input.role ?? 'STUDENT',
      status: input.status ?? 'ACTIVE',
      passwordHash: await hashPassword(password),
    },
  });
  return { user, password };
}

// Creates a user with the given role and signs them in; returns what requests need.
export async function signedInAs(role: Role = 'STUDENT', input: CreateUserInput = {}) {
  const { user, password } = await createUser({ ...input, role });
  const { api, refreshCookieFrom } = await import('./app.js');
  const res = await api.post('/api/auth/login').send({ email: user.email, password });
  if (res.status !== 200) throw new Error(`login failed for ${role}: ${res.status}`);
  return { user, password, auth: `Bearer ${res.body.accessToken}`, cookie: refreshCookieFrom(res)! };
}

export async function createCategory(name = `Category ${randomUUID().slice(0, 6)}`) {
  return prisma.category.create({ data: { name, nameKey: name.trim().toLowerCase() } });
}

export interface CreateCourseInput {
  ownerId: string;
  categoryId?: string;
  title?: string;
  status?: CourseStatus;
}

export async function createCourse(input: CreateCourseInput) {
  const categoryId = input.categoryId ?? (await createCategory()).id;
  return prisma.course.create({
    data: {
      title: input.title ?? 'Test course',
      shortDescription: 'A short description',
      level: 'BEGINNER',
      categoryId,
      ownerId: input.ownerId,
      status: input.status ?? 'DRAFT',
    },
  });
}
