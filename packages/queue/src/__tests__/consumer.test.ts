import type { Job } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';

import { withPayloadValidation } from '../consumer';
import type { TestRunJobPayload } from '../job-payload';

const VALID_PAYLOAD: TestRunJobPayload = {
  testRunId: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222',
  projectId: '33333333-3333-4333-8333-333333333333',
  environmentId: '44444444-4444-4444-8444-444444444444',
  type: 'functional',
};

function fakeJob(data: unknown): Job<TestRunJobPayload> {
  return { data } as unknown as Job<TestRunJobPayload>;
}

describe('withPayloadValidation', () => {
  it('parses the job payload and invokes the processor with it', async () => {
    const processor = vi.fn().mockResolvedValue(undefined);
    const handler = withPayloadValidation(processor);

    const job = fakeJob(VALID_PAYLOAD);
    await handler(job);

    expect(processor).toHaveBeenCalledTimes(1);
    expect(processor).toHaveBeenCalledWith(VALID_PAYLOAD, job);
  });

  it('rejects an invalid payload before ever calling the processor', async () => {
    const processor = vi.fn().mockResolvedValue(undefined);
    const handler = withPayloadValidation(processor);

    await expect(handler(fakeJob({ ...VALID_PAYLOAD, testRunId: 'not-a-uuid' }))).rejects.toThrow();
    expect(processor).not.toHaveBeenCalled();
  });

  it('rejects a payload missing a required field before calling the processor', async () => {
    const processor = vi.fn().mockResolvedValue(undefined);
    const handler = withPayloadValidation(processor);
    const { environmentId: _environmentId, ...withoutEnvironmentId } = VALID_PAYLOAD;

    await expect(handler(fakeJob(withoutEnvironmentId))).rejects.toThrow();
    expect(processor).not.toHaveBeenCalled();
  });
});
