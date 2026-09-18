import type { OrganizationRole } from '@qavio/types';

/**
 * Centralized permission matrix. This is UI convenience only — deciding
 * what to render (show/hide an "Invite" button, disable a menu item) —
 * never the actual authorization boundary. Every mutation this gates is
 * independently enforced by Postgres Row Level Security (see
 * supabase/migrations), which is what actually stops an unauthorized
 * request; this file existing wrong would produce a confusing UI, never
 * a security hole.
 *
 * Mirrors `organization_role_rank()` in supabase/migrations — keep the
 * two in sync.
 */
const ROLE_RANK: Record<OrganizationRole, number> = {
  owner: 4,
  admin: 3,
  qa: 2,
  developer: 2,
  viewer: 1,
};

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  qa: 'QA',
  developer: 'Developer',
  viewer: 'Viewer',
};

/** Ordered highest → lowest, for role picker UIs. */
export const ALL_ROLES: OrganizationRole[] = ['owner', 'admin', 'qa', 'developer', 'viewer'];

export type Permission =
  /** Rename the organization, view org-level settings. */
  | 'manage_organization'
  /** Invite, remove, and change the role of members. */
  | 'manage_members'
  /** Create/update/delete projects and environments. */
  | 'manage_projects'
  /** Run and manage QA workflows (test suites, test runs). */
  | 'manage_test_workflows'
  /** View test results and work with issues (comment, change status). */
  | 'manage_issues'
  /** Read-only access to results, issues, and reports. */
  | 'view_results';

const RANK_GATED: Record<Exclude<Permission, 'manage_test_workflows'>, number> = {
  manage_organization: ROLE_RANK.admin,
  manage_members: ROLE_RANK.admin,
  manage_projects: ROLE_RANK.admin,
  manage_issues: ROLE_RANK.developer,
  view_results: ROLE_RANK.viewer,
};

/**
 * QA and DEVELOPER share a rank (see ROLE_RANK) but aren't interchangeable:
 * only QA (and admin/owner above it) runs and manages test workflows.
 * Developer can view results and work issues, but not launch a run — so
 * this one permission can't be expressed as a rank threshold.
 */
const TEST_WORKFLOW_ROLES: OrganizationRole[] = ['owner', 'admin', 'qa'];

export function hasPermission(role: OrganizationRole, permission: Permission): boolean {
  if (permission === 'manage_test_workflows') {
    return TEST_WORKFLOW_ROLES.includes(role);
  }
  return ROLE_RANK[role] >= RANK_GATED[permission];
}

export function hasRole(role: OrganizationRole, minRole: OrganizationRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

/**
 * Roles an actor with `assignerRole` may assign to someone else. Mirrors
 * the owner-guard added in 20250201001300_membership_role_guardrails.sql:
 * only an owner may grant the owner role, and only an admin+ may assign
 * at all.
 */
export function assignableRoles(assignerRole: OrganizationRole): OrganizationRole[] {
  if (!hasPermission(assignerRole, 'manage_members')) return [];
  return assignerRole === 'owner' ? ALL_ROLES : ALL_ROLES.filter((role) => role !== 'owner');
}
