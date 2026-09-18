import type { Id, Timestamp } from './common';

export type FixSuggestionStatus = 'proposed' | 'approved' | 'rejected' | 'applied';

export interface FixSuggestion {
  id: Id;
  organizationId: Id;
  issueId: Id;
  aiAnalysisId: Id | null;
  description: string;
  diff: string | null;
  status: FixSuggestionStatus;
  approvedBy: Id | null;
  approvedAt: Timestamp | null;
  createdAt: Timestamp;
}
