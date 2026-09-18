import type { Id, Timestamp } from './common';

/** Written by workers/ai. Always about a test result, an issue, or both. */
export interface AIAnalysis {
  id: Id;
  organizationId: Id;
  testResultId: Id | null;
  issueId: Id | null;
  provider: string;
  model: string;
  promptTokens: number | null;
  completionTokens: number | null;
  summary: string;
  rawResponse: Record<string, unknown> | null;
  createdAt: Timestamp;
}
