import { createTestRunQueue, enqueueTestRun as enqueueTestRunJob, type TestRunJobPayload } from '@qavio/queue';

import { getQueueEnv } from '@/lib/env';

/**
 * One BullMQ connection, reused across invocations within a warm
 * serverless instance instead of reconnecting to Redis on every Server
 * Action call. Only ever constructed lazily, on the first call that
 * actually needs it — see `getQueueEnv`'s own doc comment for why this
 * can't be a module-scope `createEnv` call.
 */
let queue: ReturnType<typeof createTestRunQueue> | undefined;

function getQueue() {
  if (!queue) {
    queue = createTestRunQueue({ redisUrl: getQueueEnv().REDIS_URL });
  }
  return queue;
}

/** Enqueues a Test Run job. The only place in apps/web that talks to Redis/BullMQ directly — see docs/test-run-engine.md. */
export async function enqueueTestRun(payload: TestRunJobPayload) {
  return enqueueTestRunJob(getQueue(), payload);
}

/**
 * Best-effort cancellation for a run that hasn't started executing yet.
 * Only removes the job while it's still `waiting`/`delayed` — once a
 * worker has picked it up (`active`), this can't forcibly stop it (see
 * docs/test-run-engine.md's Cancellation section); the caller still
 * flips the database status either way, which is what the UI and any
 * future worker-side check actually honor. Returns whether the job was
 * removed, purely for logging — callers should never fail the request
 * over this either way.
 */
export async function removeQueuedTestRunJob(testRunId: string): Promise<boolean> {
  const job = await getQueue().getJob(testRunId);
  if (!job) return false;

  const state = await job.getState();
  if (state !== 'waiting' && state !== 'delayed') return false;

  await job.remove();
  return true;
}
