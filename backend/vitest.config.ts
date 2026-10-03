import os from 'node:os';
import path from 'node:path';
import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL = 'postgresql://learnpath:learnpath@localhost:5433/learnpath_test';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/helpers/global-setup.ts'],
    setupFiles: ['tests/helpers/setup.ts'],
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    env: {
      DATABASE_URL: TEST_DATABASE_URL,
      BCRYPT_COST: '4',
      APP_URL: 'http://localhost:4200',
      UPLOADS_DIR: path.join(os.tmpdir(), 'learnpath-test-uploads'),
    },
  },
});
