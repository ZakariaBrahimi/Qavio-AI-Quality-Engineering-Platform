import { describe, expect, it } from 'vitest';

import { createEnv, publicEnvSchema } from '@qavio/config';

describe('publicEnvSchema', () => {
  it('throws a readable error when required variables are missing', () => {
    expect(() => createEnv(publicEnvSchema, {})).toThrow(/NEXT_PUBLIC_/);
  });

  it('parses when all required variables are present', () => {
    const env = createEnv(publicEnvSchema, {
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    });
    expect(env.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
  });
});
