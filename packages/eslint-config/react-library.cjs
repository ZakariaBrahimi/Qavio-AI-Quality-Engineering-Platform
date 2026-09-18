/**
 * ESLint config for React component libraries (e.g. packages/ui) that are
 * not themselves a Next.js app.
 */
module.exports = {
  root: true,
  extends: ['./base.cjs', 'plugin:react/recommended', 'plugin:react-hooks/recommended'],
  parserOptions: {
    ecmaFeatures: { jsx: true },
  },
  env: {
    browser: true,
  },
  settings: {
    react: { version: 'detect' },
  },
  rules: {
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
  },
};
