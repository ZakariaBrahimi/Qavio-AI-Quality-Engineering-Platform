import type { OrganizationRole } from '@qavio/types';
import { describe, expect, it } from 'vitest';

import { ALL_ROLES, assignableRoles, hasPermission, hasRole } from '../rbac';

describe('hasRole', () => {
  it('ranks owner above admin above {qa, developer} above viewer', () => {
    expect(hasRole('owner', 'admin')).toBe(true);
    expect(hasRole('admin', 'owner')).toBe(false);
    expect(hasRole('qa', 'developer')).toBe(true);
    expect(hasRole('developer', 'qa')).toBe(true);
    expect(hasRole('viewer', 'developer')).toBe(false);
  });
});

describe('hasPermission', () => {
  it('gates manage_organization and manage_members at admin+', () => {
    for (const role of ['owner', 'admin'] as OrganizationRole[]) {
      expect(hasPermission(role, 'manage_organization')).toBe(true);
      expect(hasPermission(role, 'manage_members')).toBe(true);
    }
    for (const role of ['qa', 'developer', 'viewer'] as OrganizationRole[]) {
      expect(hasPermission(role, 'manage_organization')).toBe(false);
      expect(hasPermission(role, 'manage_members')).toBe(false);
    }
  });

  it('lets QA (not developer) manage test workflows, despite equal rank', () => {
    expect(hasPermission('qa', 'manage_test_workflows')).toBe(true);
    expect(hasPermission('developer', 'manage_test_workflows')).toBe(false);
    expect(hasPermission('owner', 'manage_test_workflows')).toBe(true);
    expect(hasPermission('admin', 'manage_test_workflows')).toBe(true);
    expect(hasPermission('viewer', 'manage_test_workflows')).toBe(false);
  });

  it('lets developer (and qa) work issues, but not viewer', () => {
    expect(hasPermission('developer', 'manage_issues')).toBe(true);
    expect(hasPermission('qa', 'manage_issues')).toBe(true);
    expect(hasPermission('viewer', 'manage_issues')).toBe(false);
  });

  it('gives every role read-only view_results access', () => {
    for (const role of ALL_ROLES) {
      expect(hasPermission(role, 'view_results')).toBe(true);
    }
  });

  it('gates view_audit_log at admin+, matching the "admins can read audit logs" RLS policy', () => {
    for (const role of ['owner', 'admin'] as OrganizationRole[]) {
      expect(hasPermission(role, 'view_audit_log')).toBe(true);
    }
    for (const role of ['qa', 'developer', 'viewer'] as OrganizationRole[]) {
      expect(hasPermission(role, 'view_audit_log')).toBe(false);
    }
  });
});

describe('assignableRoles', () => {
  it('returns nothing for roles that cannot manage members', () => {
    expect(assignableRoles('qa')).toEqual([]);
    expect(assignableRoles('developer')).toEqual([]);
    expect(assignableRoles('viewer')).toEqual([]);
  });

  it('lets an admin assign every role except owner', () => {
    expect(assignableRoles('admin')).not.toContain('owner');
    expect(assignableRoles('admin')).toEqual(expect.arrayContaining(['admin', 'qa', 'developer', 'viewer']));
  });

  it('only an owner can assign the owner role', () => {
    expect(assignableRoles('owner')).toContain('owner');
  });
});
