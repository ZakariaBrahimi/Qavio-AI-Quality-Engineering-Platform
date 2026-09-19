import { createEnv, workerEnvSchema } from '@qavio/config';
import { createSupabaseAdminClient } from '@qavio/database';

import { PlaceholderTestExecutor } from './executors/placeholder-executor';
import { PlaywrightTestExecutor } from './executors/playwright-executor';
import { RoutingTestExecutor } from './executors/routing-executor';
import { logger } from './logger';
import * as repository from './repository';
import { createTestRunWorker } from './worker';

const env = createEnv(workerEnvSchema);

const admin = createSupabaseAdminClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

/** Loaded fresh per run, never trusted from the queue payload — see repository.loadExecutionTarget. */
async function resolvePlaywrightTarget(context: { organizationId: string; projectId: string; environmentId: string }) {
  const target = await repository.loadExecutionTarget(admin, context.organizationId, context.projectId, context.environmentId);
  return target ? { baseUrl: target.baseUrl } : null;
}

const playwrightExecutor = new PlaywrightTestExecutor({
  resolveTarget: resolvePlaywrightTarget,
  onProgress: (context, message) => repository.updateProgress(admin, context.organizationId, context.testRunId, message),
});

// Phase 7's real browser-based engine only applies to `web` projects — mobile/api projects
// keep running the deterministic placeholder (see docs/test-run-engine.md's "NO OTHER QA
// ENGINES" section).
const executor = new RoutingTestExecutor({
  loadPlatform: async (context) => {
    const target = await repository.loadExecutionTarget(admin, context.organizationId, context.projectId, context.environmentId);
    return target?.projectPlatform ?? null;
  },
  webExecutor: playwrightExecutor,
  fallbackExecutor: new PlaceholderTestExecutor(),
});

const worker = createTestRunWorker({
  redisUrl: env.REDIS_URL,
  concurrency: env.WORKER_CONCURRENCY,
  admin,
  timeoutMs: env.TEST_RUN_TIMEOUT_MS,
  executor,
});

worker.on('completed', (job) => {
  logger.info('BullMQ job completed', { jobId: job.id, testRunId: job.data.testRunId });
});

worker.on('failed', (job, error) => {
  logger.error('BullMQ job failed', { jobId: job?.id, testRunId: job?.data.testRunId }, { error: error.message });
});

worker.on('error', (error) => {
  logger.error('Worker error', {}, { error: error.message });
});

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.on(signal, () => {
    logger.info(`Received ${signal}, shutting down worker`);
    void worker.close().then(() => process.exit(0));
  });
}
