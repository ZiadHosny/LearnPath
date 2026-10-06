import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../../src/config/env.validation.js';
import { PrismaClient } from '../../src/generated/prisma/client.js';

// The tests' own client for setup and inspection, separate from the app's PrismaService.
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  omit: { user: { passwordHash: true } },
});

export async function truncateAll(): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename <> '_prisma_migrations'`;
  if (tables.length === 0) return;
  const list = tables.map((t) => `"public"."${t.tablename}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}
