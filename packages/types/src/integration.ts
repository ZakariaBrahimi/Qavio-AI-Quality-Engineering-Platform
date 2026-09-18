import type { Id, Timestamp } from './common';

/** Bug-tracker destinations Qavio can export detected bugs to. */
export type IntegrationProvider = 'jira' | 'clickup' | 'notion' | 'linear' | 'github' | 'gitlab';

export interface Integration {
  id: Id;
  organizationId: Id;
  provider: IntegrationProvider;
  isConnected: boolean;
  createdAt: Timestamp;
}
