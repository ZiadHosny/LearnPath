import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['node_modules/', 'dist/', 'coverage/', 'src/generated/', 'uploads/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Express error middleware and Nest filters keep unused parameters by signature.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
);
