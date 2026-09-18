import type { Id, Timestamp } from './common';

/**
 * The kind of application under test. Only `web` has a working execution
 * path in this phase — the others are modeled now so the schema does not
 * need to change when their workers ship.
 */
export type ProjectPlatform = 'web' | 'mobile' | 'api';

export interface Project {
  id: Id;
  organizationId: Id;
  name: string;
  slug: string;
  description: string | null;
  platform: ProjectPlatform;
  /** Non-null once archived — archiving is a soft delete, never removes the row. */
  archivedAt: Timestamp | null;
  createdBy: Id | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function isProjectArchived(project: Pick<Project, 'archivedAt'>): boolean {
  return project.archivedAt !== null;
}
