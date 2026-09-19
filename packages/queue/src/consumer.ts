import { Worker, type Job } from 'bullmq';

import { testRunJobPayloadSchema, type TestRunJobPayload } from './job-payload';
import { TEST_RUN_QUEUE_NAME } from './queue-name';

export interface TestRunWorkerOptions {
  redisUrl: string;
  /** Caps how many jobs this worker process runs at once — see docs/test-run-engine.md's Concurrency section. A worker never assumes it can run unlimited browsers in parallel. */
  concurrency: number;
}

/** The one thing a worker process supplies — everything BullMQ-specific (queue name, connection, concurrency, payload validation) stays here so it never has to. */
export type TestRunJobProcessor = (payload: TestRunJobPayload, job: Job<TestRunJobPayload>) => Promise<void>;

/**
 * Wraps a processor with payload validation. Exported on its own (rather
 * than inlined into `createTestRunWorker`) so it's unit-testable without a
 * real BullMQ `Worker` — constructing one always attempts a Redis
 * connection, which a unit test shouldn't need just to prove a malformed
 * job payload never reaches the caller's processor.
 */
export function withPayloadValidation(
  processor: TestRunJobProcessor,
): (job: Job<TestRunJobPayload>) => Promise<void> {
  return async (job) => {
    const payload = testRunJobPayloadSchema.parse(job.data);
    await processor(payload, job);
  };
}

/**
 * Builds the BullMQ `Worker` for the test-run queue. This is the only place
 * in the execution plane that constructs a `Worker` — `workers/web` (and any
 * future worker for another test type) supplies just a processor function,
 * so retry/backoff/concurrency wiring can't drift between them.
 */
export function createTestRunWorker(
  options: TestRunWorkerOptions,
  processor: TestRunJobProcessor,
): Worker<TestRunJobPayload> {
  return new Worker<TestRunJobPayload>(TEST_RUN_QUEUE_NAME, withPayloadValidation(processor), {
    connection: { url: options.redisUrl },
    concurrency: options.concurrency,
  });
}
