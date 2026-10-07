import { defineConfig } from 'vitest/config';

// Decorator metadata for NestJS dependency injection comes from tsconfig.json
// (experimentalDecorators + emitDecoratorMetadata), which Vite 8's transformer honours.
export default defineConfig({
  test: {
    globals: true,
    include: ['tests/**/*.test.ts'],
    // One shared test database: run files one after another.
    // Known issue (Windows): about 1 run in 10 a worker exits with 0xC0000409 before running its
    // file (native crash in the toolchain, not in our code). The default 'forks' pool reports which
    // file did not run; rerun the suite. See specs/003-nest12-alignment/checklists/verification.md.
    fileParallelism: false,
    testTimeout: 20_000,
    hookTimeout: 60_000,
    globalSetup: ['tests/helpers/global-setup.ts'],
    setupFiles: ['tests/helpers/test-env.ts', 'tests/helpers/setup.ts'],
  },
});
