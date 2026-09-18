import type { Id, Timestamp } from './common';

export type MemberRole = 'owner' | 'admin' | 'member';

export interface Organization {
  id: Id;
  name: string;
  slug: string;
  createdAt: Timestamp;
}

export interface OrganizationMember {
  id: Id;
  organizationId: Id;
  userId: Id;
  role: MemberRole;
  createdAt: Timestamp;
}
