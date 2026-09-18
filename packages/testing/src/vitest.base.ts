import { type UserConfig, defineConfig } from 'vitest/config';

/**
 * Base Vitest config shared by every package. Individual packages call
 * `mergeConfig(baseVitestConfig, defineConfig({ ... }))` to layer on
 * package-specific settings (e.g. a jsdom environment for React components).
 */
export const baseVitestConfig: UserConfig = defineConfig({
  test: {
    environment: 'node',
    passWithNoTests: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
