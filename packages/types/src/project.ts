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
  platform: ProjectPlatform;
  createdAt: Timestamp;
}
