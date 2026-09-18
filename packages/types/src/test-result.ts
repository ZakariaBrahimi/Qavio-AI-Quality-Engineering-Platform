import type { Id, Timestamp } from './common';

export type TestResultStatus = 'passed' | 'failed' | 'skipped' | 'timed_out';

/** A stored artifact produced while executing a test (screenshot, video, trace, log). */
export interface TestArtifact {
  id: Id;
  testResultId: Id;
  kind: 'screenshot' | 'video' | 'trace' | 'log';
  storagePath: string;
  createdAt: Timestamp;
}

export interface TestResult {
  id: Id;
  testRunId: Id;
  name: string;
  status: TestResultStatus;
  durationMs: number;
  errorMessage: string | null;
  createdAt: Timestamp;
}
