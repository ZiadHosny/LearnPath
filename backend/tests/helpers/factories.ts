import { randomUUID } from 'node:crypto';
import type { Role, UserStatus } from '../../src/generated/prisma/enums.js';
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
