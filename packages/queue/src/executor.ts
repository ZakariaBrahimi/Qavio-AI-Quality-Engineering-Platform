import type { TestResultStatus, TestRunType } from '@qavio/types';

/**
 * Decouples the worker's orchestration (loading the run, transitioning its
 * status, writing results) from *how* tests actually get run. Phase 6 wires
 * a `PlaceholderTestExecutor` (workers/web); Phase 7 adds a
 * `PlaywrightTestExecutor` that implements this same interface — the
 * orchestration code around it does not change.
 */
export interface TestExecutionContext {
  testRunId: string;
  organizationId: string;
  projectId: string;
  environmentId: string;
  type: TestRunType;
  /** The run's `test_runs.configuration` row, loaded by the worker — never carried in the queue payload itself (see job-payload.ts). Phase 6's deterministic executor reads a couple of test-only keys from this (see workers/web's PlaceholderTestExecutor); a real executor is free to ignore it entirely. */
  configuration: Record<string, unknown>;
  /**
   * Aborted when the run is cancelled or its timeout elapses. An executor
   * should check `signal.aborted` between test cases and stop promptly —
   * Phase 6's placeholder executor does this itself; it doesn't yet have a
   * real in-flight process to kill, so this is what makes that honest
   * rather than pretended (see docs/test-run-engine.md's Cancellation
   * section).
   */
  signal: AbortSignal;
}

export interface TestExecutionResultItem {
  name: string;
  status: TestResultStatus;
  durationMs: number;
  errorMessage?: string | null;
}

export interface TestExecutionResult {
  status: 'completed' | 'failed';
  /** Run-level failure reason (couldn't start, timed out) — set only when `status` is `'failed'`. */
  errorMessage?: string;
  results: TestExecutionResultItem[];
}

export interface TestExecutor {
  execute(context: TestExecutionContext): Promise<TestExecutionResult>;
}
