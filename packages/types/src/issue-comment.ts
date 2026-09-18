import type { Id, Timestamp } from './common';

/** `authorId` is null for a comment left by AI analysis rather than a person. */
export interface IssueComment {
  id: Id;
  organizationId: Id;
  issueId: Id;
  authorId: Id | null;
  body: string;
  createdAt: Timestamp;
}
