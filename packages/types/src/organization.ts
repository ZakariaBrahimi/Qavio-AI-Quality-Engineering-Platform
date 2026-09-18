import type { Id, Timestamp } from './common';

/**
 * OWNER > ADMIN > {QA, DEVELOPER} > VIEWER. QA and DEVELOPER are peers —
 * see `organization_role_rank` in supabase/migrations, the single place
 * this hierarchy is defined.
 */
export type OrganizationRole = 'owner' | 'admin' | 'qa' | 'developer' | 'viewer';

export interface Organization {
  id: Id;
  name: string;
  slug: string;
  createdBy: Id | null;
  createdAt: Timestamp;
}

export interface OrganizationMember {
  id: Id;
  organizationId: Id;
  userId: Id;
  role: OrganizationRole;
  invitedBy: Id | null;
  createdAt: Timestamp;
}
