import type { Id, Timestamp } from './common';

export type UsageEventType =
  | 'test_run'
  | 'browser_minutes'
  | 'ai_request'
  | 'ai_tokens'
  | 'artifact_storage';

/** Append-only billing/operational usage ledger, written only by workers/the server. */
export interface UsageEvent {
  id: Id;
  organizationId: Id;
  projectId: Id | null;
  testRunId: Id | null;
  eventType: UsageEventType;
  provider: string | null;
  model: string | null;
  quantity: number;
  unit: string;
  estimatedCostCents: number | null;
  metadata: Record<string, unknown>;
  createdAt: Timestamp;
}
