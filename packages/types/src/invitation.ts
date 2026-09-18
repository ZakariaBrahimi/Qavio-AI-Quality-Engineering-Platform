import type { Id, Timestamp } from './common';
import type { OrganizationRole } from './organization';

export type InvitationStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface Invitation {
  id: Id;
  organizationId: Id;
  email: string;
  role: OrganizationRole;
  invitedBy: Id | null;
  status: InvitationStatus;
  expiresAt: Timestamp;
  acceptedAt: Timestamp | null;
  createdAt: Timestamp;
}
