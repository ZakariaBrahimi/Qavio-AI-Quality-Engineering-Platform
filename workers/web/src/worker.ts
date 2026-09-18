import { Worker } from 'bullmq';
import { chromium } from 'playwright';

import { runBasicPageCheck } from './checks/basic-page-check';
import { TEST_RUN_QUEUE_NAME } from './queue';
import { testRunJobSchema } from './schema';

export interface WorkerOptions {
  redisUrl: string;
  concurrency: number;
  headless: boolean;
}

/**
 * Consumes queued Test Runs and executes the (currently minimal) functional
 * check against the environment's base URL. Screenshot/video/trace capture
 * and multi-test suites are follow-up work, not this phase.
 */
export function createTestRunWorker({ redisUrl, concurrency, headless }: WorkerOptions) {
  return new Worker(
    TEST_RUN_QUEUE_NAME,
    async (job) => {
      const payload = testRunJobSchema.parse(job.data);
      const browser = await chromium.launch({ headless });

      try {
        const page = await browser.newPage();
        return await runBasicPageCheck(page, payload.baseUrl);
      } finally {
        await browser.close();
      }
    },
    { connection: { url: redisUrl }, concurrency },
  );
}
