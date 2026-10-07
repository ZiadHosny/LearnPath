// Plain JS so Jest can read it without ts-node; test files are compiled by @swc/jest.
/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      '@swc/jest',
      {
        jsc: {
          parser: { syntax: 'typescript', decorators: true },
          transform: { legacyDecorator: true, decoratorMetadata: true },
          target: 'es2023',
        },
        module: { type: 'commonjs' },
      },
    ],
  },
  // Sources import siblings with a .js suffix (NodeNext); Jest resolves the .ts file.
  moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
  globalSetup: '<rootDir>/tests/helpers/global-setup.ts',
  setupFiles: ['<rootDir>/tests/helpers/jest-env.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/helpers/setup.ts'],
  testTimeout: 20_000,
};
