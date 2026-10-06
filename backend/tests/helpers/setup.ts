import { resetClock } from '../../src/lib/clock.js';
import { closeApp, initApp } from './app.js';
import { prisma, truncateAll } from './db.js';

beforeAll(async () => {
  await initApp();
});

beforeEach(async () => {
  resetClock();
  await truncateAll();
});

afterAll(async () => {
  await closeApp();
  await prisma.$disconnect();
});
