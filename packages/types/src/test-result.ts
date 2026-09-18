import type { Id, Timestamp } from './common';

export type TestResultStatus = 'passed' | 'failed' | 'skipped' | 'blocked';

export interface TestResult {
  id: Id;
  organizationId: Id;
  testRunId: Id;
  testCaseId: Id | null;
  name: string;
  status: TestResultStatus;
  durationMs: number;
  errorMessage: string | null;
  createdAt: Timestamp;
}
