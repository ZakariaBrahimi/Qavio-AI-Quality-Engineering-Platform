import path from 'node:path';

import react from '@vitejs/plugin-react';
import { mergeConfig } from 'vitest/config';

import { baseVitestConfig } from '@qavio/testing';

export default mergeConfig(baseVitestConfig, {
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
