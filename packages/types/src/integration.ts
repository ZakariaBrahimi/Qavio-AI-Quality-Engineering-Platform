import type { Id, Timestamp } from './common';

/** Bug-tracker destinations Qavio can export detected issues to. */
export type IntegrationProvider = 'jira' | 'clickup' | 'notion' | 'linear' | 'github' | 'gitlab';

export interface Integration {
  id: Id;
  organizationId: Id;
  provider: IntegrationProvider;
  isConnected: boolean;
  /** Provider-specific, genuinely dynamic settings (e.g. default project key). */
  config: Record<string, unknown>;
  connectedBy: Id | null;
  connectedAt: Timestamp | null;
  createdAt: Timestamp;
}
