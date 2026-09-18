import type { Id, Timestamp } from './common';

/**
 * The lifecycle of a Test Run, from creation through queueing to execution.
 * Mirrors BullMQ job states so the control plane can render progress
 * without polling the execution plane directly.
 */
export type TestRunStatus = 'queued' | 'running' | 'passed' | 'failed' | 'cancelled' | 'error';

/** Only `functional` has a real worker in this phase. */
export type TestRunType = 'functional' | 'visual' | 'responsive' | 'security';

export interface TestRun {
  id: Id;
  projectId: Id;
  environmentId: Id;
  type: TestRunType;
  status: TestRunStatus;
  triggeredBy: Id;
  queueJobId: string | null;
  startedAt: Timestamp | null;
  finishedAt: Timestamp | null;
  createdAt: Timestamp;
}

export const TEST_RUN_TERMINAL_STATUSES: readonly TestRunStatus[] = [
  'passed',
  'failed',
  'cancelled',
  'error',
];

/** True once a run has stopped executing, whatever its outcome. */
export function isTestRunFinished(status: TestRunStatus): boolean {
  return TEST_RUN_TERMINAL_STATUSES.includes(status);
}
