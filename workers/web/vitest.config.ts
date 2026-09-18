import { mergeConfig } from 'vitest/config';

import { baseVitestConfig } from '@qavio/testing';

export default mergeConfig(baseVitestConfig, {
  test: {
    testTimeout: 30_000,
  },
});
