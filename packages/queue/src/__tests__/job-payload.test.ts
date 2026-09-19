import { describe, expect, it } from 'vitest';

import { testRunJobPayloadSchema } from '../job-payload';

const VALID_PAYLOAD = {
  testRunId: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222',
  projectId: '33333333-3333-4333-8333-333333333333',
  environmentId: '44444444-4444-4444-8444-444444444444',
  type: 'functional',
};

describe('testRunJobPayloadSchema', () => {
  it('accepts a well-formed payload', () => {
    expect(testRunJobPayloadSchema.parse(VALID_PAYLOAD)).toEqual(VALID_PAYLOAD);
  });

  it('rejects a non-uuid id', () => {
    expect(() => testRunJobPayloadSchema.parse({ ...VALID_PAYLOAD, testRunId: 'not-a-uuid' })).toThrow();
  });

  it('rejects an unrecognized test type', () => {
    expect(() => testRunJobPayloadSchema.parse({ ...VALID_PAYLOAD, type: 'load' })).toThrow();
  });

  it('rejects a missing field', () => {
    const { environmentId: _environmentId, ...withoutEnvironmentId } = VALID_PAYLOAD;
    expect(() => testRunJobPayloadSchema.parse(withoutEnvironmentId)).toThrow();
  });

  it('rejects a payload carrying an unexpected field like baseUrl or credentials', () => {
    const parsed = testRunJobPayloadSchema.parse({ ...VALID_PAYLOAD, baseUrl: 'https://example.com' });
    expect(parsed).not.toHaveProperty('baseUrl');
  });
});
