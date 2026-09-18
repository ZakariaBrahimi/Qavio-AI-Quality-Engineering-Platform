import type { Id, Timestamp } from './common';

/**
 * Written via the `log_audit_event()` database function (see
 * supabase/migrations) so every "who did what" event in the system has
 * exactly one row shape, whether it came from a DB trigger (role
 * changes, credential changes) or application code (everything else —
 * logins, invitations, test run creation, issue changes, AI fix
 * approvals; see docs/database.md).
 */
export interface AuditLog {
  id: Id;
  organizationId: Id;
  /** Null actor means the system (a worker, a webhook) performed the action. */
  actorId: Id | null;
  action: string;
  targetType: string | null;
  targetId: Id | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: Timestamp;
}
