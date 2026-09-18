import { Queue } from 'bullmq';

import type { TestRunJob } from './schema';

/** Shared BullMQ queue name between the control plane (producer) and this worker (consumer). */
export const TEST_RUN_QUEUE_NAME = 'web-functional-test-runs';

export function createTestRunQueue(redisUrl: string) {
  return new Queue<TestRunJob>(TEST_RUN_QUEUE_NAME, { connection: { url: redisUrl } });
}
