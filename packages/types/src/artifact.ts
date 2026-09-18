import type { Id, Timestamp } from './common';

export type ArtifactKind = 'screenshot' | 'video' | 'trace' | 'log' | 'dom_snapshot' | 'json_report';

/**
 * Metadata/reference only — the bytes live in Supabase Storage under
 * organizations/{organizationId}/projects/{projectId}/test-runs/{testRunId}/...
 * (see supabase/migrations for the storage bucket + RLS policy).
 */
export interface Artifact {
  id: Id;
  organizationId: Id;
  testResultId: Id;
  kind: ArtifactKind;
  storageBucket: string;
  storagePath: string;
  contentType: string | null;
  sizeBytes: number | null;
  checksum: string | null;
  createdAt: Timestamp;
}
