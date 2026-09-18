import { describe, expect, it } from 'vitest';

import { testRunJobSchema } from '../schema';

describe('testRunJobSchema', () => {
  const valid = {
    testRunId: '11111111-1111-1111-1111-111111111111',
    projectId: '22222222-2222-2222-2222-222222222222',
    environmentId: '33333333-3333-3333-3333-333333333333',
    baseUrl: 'https://example.com',
  };

  it('accepts a well-formed job payload', () => {
    expect(testRunJobSchema.parse(valid)).toEqual(valid);
  });

  it('rejects a payload with a non-UUID id', () => {
    expect(() => testRunJobSchema.parse({ ...valid, testRunId: 'not-a-uuid' })).toThrow();
  });

  it('rejects a payload with an invalid base URL', () => {
    expect(() => testRunJobSchema.parse({ ...valid, baseUrl: 'not-a-url' })).toThrow();
  });
});
