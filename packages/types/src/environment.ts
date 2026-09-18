import type { Id, Timestamp } from './common';

/** The deployment tier this environment represents. */
export type EnvironmentKind = 'production' | 'staging' | 'preview' | 'local';

export interface Environment {
  id: Id;
  organizationId: Id;
  projectId: Id;
  name: string;
  kind: EnvironmentKind;
  baseUrl: string;
  /** Free-form settings (custom headers, viewport, feature flags, …) — a plain object, never an array or scalar. */
  configuration: Record<string, unknown>;
  isDefault: boolean;
  /** Non-null once archived — archiving is a soft delete, never removes the row. */
  archivedAt: Timestamp | null;
  createdBy: Id | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function isEnvironmentArchived(environment: Pick<Environment, 'archivedAt'>): boolean {
  return environment.archivedAt !== null;
}
