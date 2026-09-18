import { createEnv, workerEnvSchema } from '@qavio/config';

import { createTestRunWorker } from './worker';

const env = createEnv(workerEnvSchema);

const worker = createTestRunWorker({
  redisUrl: env.REDIS_URL,
  concurrency: env.WORKER_CONCURRENCY,
  headless: env.PLAYWRIGHT_HEADLESS,
});

worker.on('completed', (job) => {
  // eslint-disable-next-line no-console
  console.log(`Test run ${job.id} completed`);
});

worker.on('failed', (job, error) => {
  console.error(`Test run ${job?.id} failed:`, error);
});
