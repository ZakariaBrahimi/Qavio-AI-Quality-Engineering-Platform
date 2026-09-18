/**
 * Root ESLint config. Only lints root-level files (scripts, root configs).
 * Each package/app extends `@qavio/eslint-config`'s shareable configs directly.
 */
module.exports = {
  root: true,
  extends: ['@qavio/eslint-config/node.cjs'],
  ignorePatterns: ['apps', 'workers', 'packages'],
};
