/**
 * ESLint config for Next.js apps (apps/web).
 */
module.exports = {
  root: true,
  extends: ['next/core-web-vitals', './base.cjs'],
  rules: {
    // Next's app router relies on default exports for pages/layouts/routes.
    'import/no-default-export': 'off',
  },
};
