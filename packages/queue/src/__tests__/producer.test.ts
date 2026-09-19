import type { Queue } from 'bullmq';
import { describe, expect, it, vi } from 'vitest';

import { enqueueTestRun } from '../producer';
import { TEST_RUN_QUEUE_NAME } from '../queue-name';
import type { TestRunJobPayload } from '../job-payload';

const VALID_PAYLOAD: TestRunJobPayload = {
  testRunId: '11111111-1111-4111-8111-111111111111',
  organizationId: '22222222-2222-4222-8222-222222222222',
  projectId: '33333333-3333-4333-8333-333333333333',
  environmentId: '44444444-4444-4444-8444-444444444444',
  type: 'functional',
};

function fakeQueue() {
  return { add: vi.fn().mockResolvedValue({ id: VALID_PAYLOAD.testRunId }) } as unknown as Queue<TestRunJobPayload>;
}

describe('enqueueTestRun', () => {
  it('inserts the job under the shared queue name with the validated payload', async () => {
    const queue = fakeQueue();
    await enqueueTestRun(queue, VALID_PAYLOAD);

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(TEST_RUN_QUEUE_NAME, VALID_PAYLOAD, expect.anything());
  });

  it('uses the test run id as the BullMQ job id, so re-enqueueing the same run dedupes instead of creating a second job', async () => {
    const queue = fakeQueue();
    await enqueueTestRun(queue, VALID_PAYLOAD);

    expect(queue.add).toHaveBeenCalledWith(
      TEST_RUN_QUEUE_NAME,
      VALID_PAYLOAD,
      expect.objectContaining({ jobId: VALID_PAYLOAD.testRunId }),
    );
  });

  it('configures retry attempts and backoff', async () => {
    const queue = fakeQueue();
    await enqueueTestRun(queue, VALID_PAYLOAD);

    expect(queue.add).toHaveBeenCalledWith(
      TEST_RUN_QUEUE_NAME,
      VALID_PAYLOAD,
      expect.objectContaining({ attempts: expect.any(Number), backoff: expect.anything() }),
    );
  });

  it('rejects an invalid payload before ever touching the queue', async () => {
    const queue = fakeQueue();
    await expect(enqueueTestRun(queue, { ...VALID_PAYLOAD, testRunId: 'not-a-uuid' })).rejects.toThrow();
    expect(queue.add).not.toHaveBeenCalled();
  });
});
