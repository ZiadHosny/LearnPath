import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { env } from '../config/env.js';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });

// passwordHash is omitted everywhere unless a query opts in with `omit: { passwordHash: false }`.
export const prisma = new PrismaClient({
  adapter,
  omit: { user: { passwordHash: true } },
});
