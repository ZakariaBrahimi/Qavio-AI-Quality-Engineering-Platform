import { Queue, type Job, type JobsOptions } from 'bullmq';

import { testRunJobPayloadSchema, type TestRunJobPayload } from './job-payload';
import { TEST_RUN_QUEUE_NAME } from './queue-name';

export interface TestRunQueueOptions {
  redisUrl: string;
}

/** One queue connection, shared by every `enqueueTestRun` call the caller makes. Callers own its lifecycle (close it on shutdown). */
export function createTestRunQueue(options: TestRunQueueOptions): Queue<TestRunJobPayload> {
  return new Queue<TestRunJobPayload>(TEST_RUN_QUEUE_NAME, {
    connection: { url: options.redisUrl },
  });
}

/**
 * Initial retry policy: 3 attempts total (1 original + 2 retries) with
 * exponential backoff starting at 5s, so a transient failure (a worker
 * restart, a momentary Redis blip) gets a couple of quick second chances
 * without hammering a genuinely broken environment. Completed/failed jobs
 * are pruned from Redis after a bounded age/count so the queue doesn't grow
 * unbounded — `test_runs`/`test_run_jobs` in Postgres remain the durable
 * record, not BullMQ's own job history.
 */
const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: { type: 'exponential', delay: 5_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 500 },
  removeOnFail: { age: 7 * 24 * 60 * 60 },
};

/**
 * Enqueues one Test Run. `jobId` is always the test run's own id — BullMQ
 * treats adding a job with a `jobId` that already exists as a no-op
 * (returns the existing job instead of creating a duplicate), so calling
 * this twice for the same test run (a retried Server Action, a double
 * form submit) can never produce two competing jobs for it.
 */
export async function enqueueTestRun(
  queue: Queue<TestRunJobPayload>,
  payload: TestRunJobPayload,
): Promise<Job<TestRunJobPayload>> {
  const validated = testRunJobPayloadSchema.parse(payload);
  return queue.add(TEST_RUN_QUEUE_NAME, validated, {
    ...DEFAULT_JOB_OPTIONS,
    jobId: validated.testRunId,
  });
}
