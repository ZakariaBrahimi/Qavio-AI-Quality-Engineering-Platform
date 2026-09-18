import type { ArtifactKind } from './artifact';
import type { Id, Timestamp } from './common';

export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low';

export type IssueStatus =
  | 'open'
  | 'in_progress'
  | 'resolved'
  | 'reopened'
  | 'ignored'
  | 'duplicate';

/** One piece of evidence attached to an issue — either a stored artifact or an external link. */
export type IssueEvidence =
  | { type: ArtifactKind; artifactId: Id }
  | { type: 'link'; url: string };

/**
 * A bug detected from a failing TestResult (by a worker) or raised by AI
 * analysis. `aiSummary` is populated asynchronously once the AI analysis
 * step runs — it is nullable so the control plane can render "analysis
 * pending" instead of faking a result.
 */
export interface Issue {
  id: Id;
  organizationId: Id;
  projectId: Id;
  testRunId: Id | null;
  testResultId: Id | null;
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  evidence: IssueEvidence[];
  aiSummary: string | null;
  externalIssueUrl: string | null;
  assignedTo: Id | null;
  createdBy: Id | null;
  createdAt: Timestamp;
}
