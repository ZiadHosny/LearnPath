import 'reflect-metadata';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../src/config/env.validation.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import type { Role, UserStatus } from '../src/generated/prisma/enums.js';
import { hashPassword } from '../src/lib/password.js';

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) });

const users: Array<{ email: string; fullName: string; role: Role; status: UserStatus }> = [
  { email: 'admin@learnpath.local', fullName: 'LearnPath Admin', role: 'ADMIN', status: 'ACTIVE' },
  { email: 'instructor@learnpath.local', fullName: 'Sample Instructor', role: 'INSTRUCTOR', status: 'ACTIVE' },
  { email: 'student@learnpath.local', fullName: 'Sample Student', role: 'STUDENT', status: 'ACTIVE' },
  { email: 'blocked@learnpath.local', fullName: 'Blocked Student', role: 'STUDENT', status: 'BLOCKED' },
];

async function main() {
  const passwordHash = await hashPassword(env.SEED_PASSWORD);
  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { role: user.role, status: user.status },
      create: { ...user, passwordHash },
    });
    console.log(`Seeded ${user.role.padEnd(10)} ${user.status.padEnd(7)} ${user.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
