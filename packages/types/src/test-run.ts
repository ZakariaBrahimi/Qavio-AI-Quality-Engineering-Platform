import type { Id, Timestamp } from './common';

/**
 * The lifecycle of a Test Run. Mirrors the worker's own state machine
 * (see supabase/migrations) plus an `analyzing` step for the AI analysis
 * pass, so the control plane never has to infer run state from queue job
 * state — the worker updates test_runs directly.
 */
export type TestRunStatus =
  | 'created'
  | 'queued'
  | 'starting'
  | 'running'
  | 'analyzing'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** Only `functional` has a real worker in this phase. */
export type TestRunType = 'functional' | 'visual' | 'responsive' | 'security';

export interface TestRun {
  id: Id;
  organizationId: Id;
  projectId: Id;
  environmentId: Id;
  testSuiteId: Id | null;
  type: TestRunType;
  status: TestRunStatus;
  triggeredBy: Id | null;
  startedAt: Timestamp | null;
  finishedAt: Timestamp | null;
  createdAt: Timestamp;
}

export const TEST_RUN_TERMINAL_STATUSES: readonly TestRunStatus[] = [
  'completed',
  'failed',
  'cancelled',
];

/** True once a run has stopped executing, whatever its outcome. */
export function isTestRunFinished(status: TestRunStatus): boolean {
  return TEST_RUN_TERMINAL_STATUSES.includes(status);
}
