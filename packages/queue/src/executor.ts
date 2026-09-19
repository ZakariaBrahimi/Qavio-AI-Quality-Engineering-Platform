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
  /**
   * Client-generated (the executor calls `crypto.randomUUID()`), not left
   * to the database default — an artifact needs a stable id to reference
   * *before* the result row has actually been inserted, and generating it
   * up front avoids a round trip. Purely random, not deterministic from
   * the run id, so nothing collides across retries (the previous
   * attempt's rows are already deleted before these are inserted — see
   * `writeTestResults`).
   */
  id: string;
  name: string;
  status: TestResultStatus;
  durationMs: number;
  errorMessage?: string | null;
}

/**
 * One piece of evidence (a screenshot, a log, …) produced alongside a
 * result. The executor only returns the raw bytes and metadata — it
 * never touches Supabase Storage or the `artifacts` table directly; the
 * worker's repository layer owns all persistence, same as it does for
 * `TestExecutionResultItem` (see docs/test-run-engine.md).
 */
export interface TestExecutionArtifact {
  /** Which result this evidence belongs to — `artifacts.test_result_id` is a required FK, so every artifact must reference a result from the same `TestExecutionResult.results` array. */
  resultId: string;
  kind: 'screenshot' | 'video' | 'trace' | 'log' | 'dom_snapshot' | 'json_report';
  /** Just the filename (e.g. `about.png`) — the worker builds the full `organizations/{orgId}/projects/{projectId}/test-runs/{testRunId}/{filename}` storage path. */
  filename: string;
  contentType: string;
  data: Buffer;
}

export interface TestExecutionResult {
  /**
   * `blocked`: the run could not meaningfully proceed for a reason that
   * isn't the target application's fault and isn't Qavio's own failure
   * either — most commonly, the target requires authentication Qavio
   * isn't configured to satisfy. Distinct from `failed` so the dashboard
   * (and anyone reading `test_runs.status`) never mistakes "needs
   * configuration" for "the application is broken" or "this passed".
   */
  status: 'completed' | 'failed' | 'blocked';
  /** Run-level failure/block reason (couldn't start, timed out, authentication required) — set when `status` is `'failed'` or `'blocked'`. */
  errorMessage?: string;
  results: TestExecutionResultItem[];
  artifacts?: TestExecutionArtifact[];
  /** A completion summary (checks passed/failed, pages visited, …) — persisted verbatim to `test_runs.summary`. Optional: PlaceholderTestExecutor doesn't produce one. */
  summary?: Record<string, unknown>;
}

export interface TestExecutor {
  execute(context: TestExecutionContext): Promise<TestExecutionResult>;
}
