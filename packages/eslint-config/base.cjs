/**
 * Base ESLint config shared by every Qavio package (Node libraries, workers).
 * React/Next.js packages extend `./react-library.cjs` or `./next.cjs` instead.
 */
module.exports = {
  root: true,
  env: {
    node: true,
    es2022: true,
  },
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  plugins: ['@typescript-eslint', 'import'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        alwaysTryTypes: true,
      },
    },
  },
  rules: {
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': [
      'error',
      { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
    ],
    '@typescript-eslint/no-non-null-assertion': 'error',
    // Import order is owned by @trivago/prettier-plugin-sort-imports (see
    // .prettierrc.json) so there is exactly one source of truth for it.
    'import/order': 'off',
    'import/no-default-export': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  ignorePatterns: [
    'node_modules',
    'dist',
    '.next',
    'build',
    'coverage',
    '.turbo',
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs',
  ],
};
