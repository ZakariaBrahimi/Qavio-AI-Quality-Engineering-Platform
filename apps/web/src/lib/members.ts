import type { InvitationStatus, OrganizationRole } from '@qavio/types';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export interface OrganizationMemberRow {
  id: string;
  userId: string;
  role: OrganizationRole;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
  createdAt: string;
}

/**
 * Member emails aren't in `profiles` (email is Supabase Auth's data, not
 * ours) and `auth.users` isn't reachable through PostgREST at all — so
 * this is the one place in the app that reaches for the admin client
 * for something other than sending an invite email. It's safe because
 * the user ids being looked up were already scoped by the RLS-protected
 * `organization_members` query just above: we're only ever resolving
 * emails for people already confirmed to be co-members of the caller's
 * own organization, never an arbitrary id.
 */
export async function getOrganizationMembers(organizationId: string): Promise<OrganizationMemberRow[]> {
  const supabase = createClient();

  const { data: members, error } = await supabase
    .from('organization_members')
    .select('id, user_id, role, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true });

  if (error || !members || members.length === 0) return [];

  const userIds = members.map((member) => member.user_id);

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url')
    .in('id', userIds);

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));

  const admin = createAdminClient();
  const emailById = new Map<string, string>();
  await Promise.all(
    userIds.map(async (userId) => {
      const { data } = await admin.auth.admin.getUserById(userId);
      if (data.user?.email) emailById.set(userId, data.user.email);
    }),
  );

  return members.map((member) => {
    const profile = profileById.get(member.user_id);
    return {
      id: member.id,
      userId: member.user_id,
      role: member.role,
      fullName: profile?.full_name ?? null,
      avatarUrl: profile?.avatar_url ?? null,
      email: emailById.get(member.user_id) ?? '',
      createdAt: member.created_at,
    };
  });
}

export interface PendingInvitationRow {
  id: string;
  email: string;
  role: OrganizationRole;
  status: InvitationStatus;
  createdAt: string;
  expiresAt: string;
}

export async function getPendingInvitations(organizationId: string): Promise<PendingInvitationRow[]> {
  const supabase = createClient();

  // Filtering on expires_at rather than trusting a persisted 'expired'
  // status: accept_invitation() only ever re-checks expiry live, it
  // never durably records it (a RAISE EXCEPTION rolls back the update
  // that would have) — see 20250201001600_fix_accept_invitation_expiry_update.sql.
  const { data, error } = await supabase
    .from('invitations')
    .select('id, email, role, status, created_at, expires_at')
    .eq('organization_id', organizationId)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error || !data) return [];

  return data.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    createdAt: invitation.created_at,
    expiresAt: invitation.expires_at,
  }));
}
