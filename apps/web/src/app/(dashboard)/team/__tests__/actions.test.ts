import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  changeMemberRole,
  inviteMember,
  removeMember,
  resendInvitation,
  revokeInvitation,
} from '../actions';

const mockGetCurrentOrganization = vi.hoisted(() => vi.fn());
const mockInviteUserByEmail = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));

/** A chainable fake matching however far each action walks the query builder. */
function chain(result: { data?: unknown; error?: unknown }) {
  const node: Record<string, unknown> = {
    select: () => node,
    insert: () => node,
    update: () => node,
    delete: () => node,
    eq: () => node,
    single: () => Promise.resolve(result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return node;
}

const mockFromResults = vi.hoisted(() => new Map<string, { data?: unknown; error?: unknown }>());

vi.mock('@/lib/organizations', () => ({
  getCurrentOrganization: mockGetCurrentOrganization,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => chain(mockFromResults.get(table) ?? { data: null, error: null }),
    rpc: mockRpc,
  }),
}));

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ auth: { admin: { inviteUserByEmail: mockInviteUserByEmail } } }),
}));

vi.mock('@/lib/env', () => ({
  getPublicEnv: () => ({ NEXT_PUBLIC_APP_URL: 'https://app.example.com' }),
}));

const ownerOrg = { organizationId: 'org-1', organizationName: 'Acme', organizationSlug: 'acme', role: 'owner' as const };
const adminOrg = { ...ownerOrg, role: 'admin' as const };
const viewerOrg = { ...ownerOrg, role: 'viewer' as const };

beforeEach(() => {
  vi.clearAllMocks();
  mockFromResults.clear();
  mockGetUser.mockResolvedValue({ data: { user: { id: 'actor-1' } } });
});

describe('inviteMember — unauthorized access', () => {
  it('rejects a viewer, who cannot manage members', async () => {
    mockGetCurrentOrganization.mockResolvedValue(viewerOrg);
    const result = await inviteMember({ email: 'new@example.com', role: 'developer' });
    expect(result.ok).toBe(false);
    expect(mockInviteUserByEmail).not.toHaveBeenCalled();
  });

  it('rejects an admin trying to invite an owner (owner-only per DB guardrail)', async () => {
    mockGetCurrentOrganization.mockResolvedValue(adminOrg);
    const result = await inviteMember({ email: 'new@example.com', role: 'owner' });
    expect(result.ok).toBe(false);
    expect(mockInviteUserByEmail).not.toHaveBeenCalled();
  });

  it('rejects when there is no active organization', async () => {
    mockGetCurrentOrganization.mockResolvedValue(null);
    const result = await inviteMember({ email: 'new@example.com', role: 'viewer' });
    expect(result.ok).toBe(false);
  });
});

describe('inviteMember — invitation flow', () => {
  it('lets an owner invite another owner, creates the row, and sends the email', async () => {
    mockGetCurrentOrganization.mockResolvedValue(ownerOrg);
    mockFromResults.set('invitations', { data: { id: 'inv-1', token: 'tok-1' }, error: null });
    mockInviteUserByEmail.mockResolvedValue({ error: null });

    const result = await inviteMember({ email: 'new@example.com', role: 'owner' });

    expect(result.ok).toBe(true);
    expect(mockInviteUserByEmail).toHaveBeenCalledWith(
      'new@example.com',
      expect.objectContaining({ redirectTo: expect.stringContaining(encodeURIComponent('/invite/tok-1')) }),
    );
  });

  it('reports an already-pending invite as a friendly error, not a raw duplicate-key message', async () => {
    mockGetCurrentOrganization.mockResolvedValue(adminOrg);
    mockFromResults.set('invitations', { data: null, error: { code: '23505', message: 'duplicate key value' } });

    const result = await inviteMember({ email: 'new@example.com', role: 'viewer' });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already pending/i);
    expect(mockInviteUserByEmail).not.toHaveBeenCalled();
  });

  it('hands back a shareable link when the invitee already has an account', async () => {
    mockGetCurrentOrganization.mockResolvedValue(adminOrg);
    mockFromResults.set('invitations', { data: { id: 'inv-1', token: 'tok-1' }, error: null });
    mockInviteUserByEmail.mockResolvedValue({ error: { message: 'User already registered' } });

    const result = await inviteMember({ email: 'existing@example.com', role: 'viewer' });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.inviteLink).toContain('/invite/tok-1');
  });
});

describe('resendInvitation / revokeInvitation — unauthorized access', () => {
  it('rejects a developer resending an invitation', async () => {
    mockGetCurrentOrganization.mockResolvedValue({ ...ownerOrg, role: 'developer' as const });
    const result = await resendInvitation({ invitationId: 'inv-1' });
    expect(result.ok).toBe(false);
    expect(mockInviteUserByEmail).not.toHaveBeenCalled();
  });

  it('rejects a qa role revoking an invitation', async () => {
    mockGetCurrentOrganization.mockResolvedValue({ ...ownerOrg, role: 'qa' as const });
    const result = await revokeInvitation({ invitationId: 'inv-1' });
    expect(result.ok).toBe(false);
  });
});

describe('changeMemberRole — role permissions', () => {
  it('rejects an invalid role before checking permissions', async () => {
    mockGetCurrentOrganization.mockResolvedValue(ownerOrg);
    const result = await changeMemberRole({ memberId: 'member-1', role: 'superadmin' });
    expect(result.ok).toBe(false);
  });

  it('rejects a developer changing anyone\'s role', async () => {
    mockGetCurrentOrganization.mockResolvedValue({ ...ownerOrg, role: 'developer' as const });
    const result = await changeMemberRole({ memberId: 'member-1', role: 'viewer' });
    expect(result.ok).toBe(false);
  });

  it('rejects an admin granting the owner role', async () => {
    mockGetCurrentOrganization.mockResolvedValue(adminOrg);
    const result = await changeMemberRole({ memberId: 'member-1', role: 'owner' });
    expect(result.ok).toBe(false);
  });

  it('lets an owner grant the owner role', async () => {
    mockGetCurrentOrganization.mockResolvedValue(ownerOrg);
    mockFromResults.set('organization_members', { data: null, error: null });
    const result = await changeMemberRole({ memberId: 'member-1', role: 'owner' });
    expect(result.ok).toBe(true);
  });

  it('surfaces the DB guardrail message when the last-owner trigger fires', async () => {
    mockGetCurrentOrganization.mockResolvedValue(ownerOrg);
    mockFromResults.set('organization_members', {
      data: null,
      error: { message: 'Cannot remove the last owner of an organization' },
    });
    const result = await changeMemberRole({ memberId: 'member-1', role: 'viewer' });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/at least one owner/i);
  });
});

describe('removeMember — unauthorized access', () => {
  it('rejects a viewer removing anyone', async () => {
    mockGetCurrentOrganization.mockResolvedValue(viewerOrg);
    const result = await removeMember({ memberId: 'member-1' });
    expect(result.ok).toBe(false);
  });

  it('lets an admin remove a non-owner member and logs the audit event', async () => {
    mockGetCurrentOrganization.mockResolvedValue(adminOrg);
    mockFromResults.set('organization_members', { data: null, error: null });

    const result = await removeMember({ memberId: 'member-1' });

    expect(result.ok).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('log_audit_event', expect.objectContaining({ p_action: 'member_removed' }));
  });
});
