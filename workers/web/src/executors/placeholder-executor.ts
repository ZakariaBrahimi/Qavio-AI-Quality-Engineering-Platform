import type { TestExecutionContext, TestExecutionResult, TestExecutor } from '@qavio/queue';

export interface DeterministicTestExecutorOptions {
  /** Simulated work duration when a run's `configuration.durationMs` doesn't specify one. */
  defaultDurationMs?: number;
}

/** Checked between simulated-work increments so cancellation interrupts promptly instead of blocking for the full duration. */
const STEP_MS = 25;

function readDurationMs(configuration: Record<string, unknown>, fallback: number): number {
  const value = configuration.durationMs;
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : fallback;
}

/**
 * Test-only escape hatch for exercising the failure/retry paths
 * deterministically. Read from `test_runs.configuration` — the same
 * server-validated column every other run setting comes from, written
 * only by `createTestRun` (apps/web) — never from a client-supplied
 * header, query param, or anything reachable without already having
 * QA+ access to create the run in the first place.
 */
function readForceFailure(configuration: Record<string, unknown>): boolean {
  return configuration.forceFailure === true;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Phase 6's deterministic stand-in for the real QA engine — proves the
 * whole pipeline (enqueue -> worker -> DB update -> UI) works end-to-end
 * without any browser automation. Playwright is Phase 7's job; this
 * executor never launches one. It simulates work for a configurable
 * duration, checking `context.signal` between steps so cancellation
 * actually interrupts it (not just a no-op check at the start), then
 * reports success unless `forceFailure` is set. Implements the same
 * `TestExecutor` interface a future `PlaywrightTestExecutor` will, so
 * `worker.ts`'s orchestration doesn't change when that lands — only this
 * class gets replaced.
 */
export class PlaceholderTestExecutor implements TestExecutor {
  constructor(private readonly options: DeterministicTestExecutorOptions = {}) {}

  async execute(context: TestExecutionContext): Promise<TestExecutionResult> {
    const startedAt = Date.now();
    const durationMs = readDurationMs(context.configuration, this.options.defaultDurationMs ?? 250);

    let elapsed = 0;
    while (elapsed < durationMs) {
      if (context.signal.aborted) {
        return { status: 'failed', errorMessage: 'Test run was cancelled during execution.', results: [] };
      }
      const step = Math.min(STEP_MS, durationMs - elapsed);
      await sleep(step);
      elapsed += step;
    }

    if (context.signal.aborted) {
      return { status: 'failed', errorMessage: 'Test run was cancelled during execution.', results: [] };
    }

    const actualDurationMs = Date.now() - startedAt;

    if (readForceFailure(context.configuration)) {
      return {
        status: 'failed',
        errorMessage: 'Deterministic check failed (forceFailure test configuration).',
        results: [
          {
            name: 'Deterministic check',
            status: 'failed',
            durationMs: actualDurationMs,
            errorMessage: 'forceFailure=true',
          },
        ],
      };
    }

    return {
      status: 'completed',
      results: [
        { name: 'Deterministic check', status: 'passed', durationMs: actualDurationMs, errorMessage: null },
      ],
    };
  }
}
