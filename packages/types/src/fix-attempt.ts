import type { Id, Timestamp } from './common';

export type FixAttemptStatus = 'pending' | 'running' | 'succeeded' | 'failed';

export interface FixAttempt {
  id: Id;
  organizationId: Id;
  fixSuggestionId: Id;
  status: FixAttemptStatus;
  pullRequestUrl: string | null;
  log: string | null;
  startedAt: Timestamp | null;
  finishedAt: Timestamp | null;
  createdAt: Timestamp;
}
