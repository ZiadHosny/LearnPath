import { execSync } from 'node:child_process';

// Runs once before all test files: apply pending migrations to the test database.
// Data is cleared per test by truncateAll() in setup.ts, so no destructive reset is needed.
export default function setup() {
  const databaseUrl = 'postgresql://learnpath:learnpath@localhost:5433/learnpath_test';
  execSync('npx prisma migrate deploy', {
    stdio: 'pipe',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
