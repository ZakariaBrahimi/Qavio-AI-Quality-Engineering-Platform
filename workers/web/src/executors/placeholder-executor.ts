import { chromium } from 'playwright';
import type { TestExecutionContext, TestExecutionResult, TestExecutor } from '@qavio/queue';

import { runBasicPageCheck } from '../checks/basic-page-check';

export interface PlaceholderTestExecutorOptions {
  headless: boolean;
  /** Injected rather than reading the DB directly, so this class stays testable without a real Supabase client. */
  loadBaseUrl: (context: TestExecutionContext) => Promise<string | null>;
}

/**
 * Phase 6's stand-in for the real QA engine — proves the whole pipeline
 * (enqueue -> worker -> DB update -> UI) works end-to-end without yet
 * implementing Playwright-based test authoring/crawling/assertions
 * (Phase 7). Implements the same `TestExecutor` interface a future
 * `PlaywrightTestExecutor` will, so `worker.ts`'s orchestration doesn't
 * change when that lands — only this class gets replaced.
 */
export class PlaceholderTestExecutor implements TestExecutor {
  constructor(private readonly options: PlaceholderTestExecutorOptions) {}

  async execute(context: TestExecutionContext): Promise<TestExecutionResult> {
    const baseUrl = await this.options.loadBaseUrl(context);
    if (!baseUrl) {
      return { status: 'failed', errorMessage: 'Environment has no base URL configured.', results: [] };
    }

    if (context.signal.aborted) {
      return { status: 'failed', errorMessage: 'Test run was cancelled before execution started.', results: [] };
    }

    const browser = await chromium.launch({ headless: this.options.headless });
    try {
      const page = await browser.newPage();
      const check = await runBasicPageCheck(page, baseUrl);

      if (context.signal.aborted) {
        return { status: 'failed', errorMessage: 'Test run was cancelled during execution.', results: [] };
      }

      return {
        status: check.status === 'passed' ? 'completed' : 'failed',
        errorMessage: check.status === 'failed' ? (check.errorMessage ?? 'Basic page check failed.') : undefined,
        results: [
          {
            name: 'Basic page load',
            status: check.status,
            durationMs: check.durationMs,
            errorMessage: check.errorMessage,
          },
        ],
      };
    } finally {
      await browser.close();
    }
  }
}
