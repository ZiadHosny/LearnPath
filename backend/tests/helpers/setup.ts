import { afterAll, beforeEach } from 'vitest';
import { resetClock } from '../../src/lib/clock.js';
import { prisma, truncateAll } from './db.js';

beforeEach(async () => {
  resetClock();
  await truncateAll();
});

afterAll(async () => {
  await prisma.$disconnect();
});
