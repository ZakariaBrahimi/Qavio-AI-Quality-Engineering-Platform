import type { Id, Timestamp } from './common';

export interface TestSuite {
  id: Id;
  organizationId: Id;
  projectId: Id;
  name: string;
  description: string | null;
  createdBy: Id | null;
  createdAt: Timestamp;
}
