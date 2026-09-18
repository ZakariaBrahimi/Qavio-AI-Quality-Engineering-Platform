import type { Id, Timestamp } from './common';

export interface Notification {
  id: Id;
  organizationId: Id;
  userId: Id;
  type: string;
  title: string;
  body: string | null;
  metadata: Record<string, unknown>;
  readAt: Timestamp | null;
  createdAt: Timestamp;
}
