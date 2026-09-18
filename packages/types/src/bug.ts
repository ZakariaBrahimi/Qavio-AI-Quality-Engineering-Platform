import type { Id, Timestamp } from './common';

export type BugSeverity = 'low' | 'medium' | 'high' | 'critical';
export type BugStatus = 'open' | 'investigating' | 'fixed' | 'wont_fix' | 'closed';

/**
 * A bug detected from a failing TestResult. `aiSummary` is populated
 * asynchronously once the AI analysis step runs — it is nullable so the
 * control plane can render "analysis pending" instead of faking a result.
 */
export interface Bug {
  id: Id;
  projectId: Id;
  testResultId: Id;
  title: string;
  severity: BugSeverity;
  status: BugStatus;
  aiSummary: string | null;
  externalIssueUrl: string | null;
  createdAt: Timestamp;
}
