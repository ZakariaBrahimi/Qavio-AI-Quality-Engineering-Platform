import type { Id, Timestamp } from './common';

export type TestRunJobStatus = 'queued' | 'active' | 'completed' | 'failed' | 'delayed';

/** One worker attempt at a TestRun (retries, or a fan-out per browser). */
export interface TestRunJob {
  id: Id;
  organizationId: Id;
  testRunId: Id;
  queueName: string;
  jobId: string;
  status: TestRunJobStatus;
  attempts: number;
  lastError: string | null;
  startedAt: Timestamp | null;
  finishedAt: Timestamp | null;
  createdAt: Timestamp;
}
