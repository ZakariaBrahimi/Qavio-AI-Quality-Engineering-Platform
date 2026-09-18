'use server';

import { z } from 'zod';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { mapDbError } from '@/lib/db-errors';
import { getPublicEnv } from '@/lib/env';
import { getCurrentOrganization } from '@/lib/organizations';
import { ALL_ROLES, hasPermission } from '@/lib/rbac';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const roleSchema = z.enum(ALL_ROLES as [string, ...string[]]);

const inviteSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  role: roleSchema,
});

function inviteCallbackUrl(token: string) {
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  return `${appUrl}/auth/callback?next=${encodeURIComponent(`/invite/${token}`)}`;
}

function inviteLinkFor(token: string) {
  return `${getPublicEnv().NEXT_PUBLIC_APP_URL}/invite/${token}`;
}

/**
 * Every mutation below re-checks the caller's role before touching
 * anything, even though Postgres RLS (see supabase/migrations) would
 * reject an unauthorized write anyway — this is what turns that DB-level
 * rejection into a clear message instead of a raw Postgres error
 * reaching the UI. The DB check remains the actual authorization
 * boundary; this is a better error message on top of it, not a
 * replacement for it.
 */
async function requireManageMembers() {
  const organization = await getCurrentOrganization();
  if (!organization) return { organization: null, error: fail('No active organization.') };
  if (!hasPermission(organization.role, 'manage_members')) {
    return { organization: null, error: fail("You don't have permission to manage members.") };
  }
  return { organization, error: null };
}

export async function inviteMember(input: {
  email: string;
  role: string;
}): Promise<ActionResult<{ inviteLink?: string }>> {
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const { organization, error } = await requireManageMembers();
  if (error) return error;

  if (parsed.data.role === 'owner' && organization.role !== 'owner') {
    return fail('Only an owner can invite another owner.');
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const email = parsed.data.email.toLowerCase();
  const { data: invitation, error: insertError } = await supabase
    .from('invitations')
    .insert({
      organization_id: organization.organizationId,
      email,
      role: parsed.data.role as (typeof ALL_ROLES)[number],
      invited_by: user?.id ?? null,
    })
    .select('id, token')
    .single();

  if (insertError || !invitation) {
    if (insertError?.code === '23505') {
      return fail('An invitation is already pending for this email.');
    }
    return fail(mapDbError(insertError));
  }

  await supabase.rpc('log_audit_event', {
    p_organization_id: organization.organizationId,
    p_action: 'invitation_created',
    p_target_type: 'invitation',
    p_target_id: invitation.id,
    p_metadata: { email, role: parsed.data.role },
  });

  const admin = createAdminClient();
  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: inviteCallbackUrl(invitation.token),
  });

  // The most common reason this fails: the invitee already has an
  // account, so Supabase won't send an "invite" email for it. The
  // invitation row is still real and still acceptable — hand back the
  // link so the inviter can share it directly instead.
  if (emailError) {
    return ok({ inviteLink: inviteLinkFor(invitation.token) });
  }

  return ok({});
}

export async function resendInvitation(input: {
  invitationId: string;
}): Promise<ActionResult<{ inviteLink?: string }>> {
  const { organization, error } = await requireManageMembers();
  if (error) return error;

  const supabase = createClient();
  const { data: invitation, error: fetchError } = await supabase
    .from('invitations')
    .select('email, token, status')
    .eq('id', input.invitationId)
    .eq('organization_id', organization.organizationId)
    .single();

  if (fetchError || !invitation) return fail('Invitation not found.');
  if (invitation.status !== 'pending') return fail('This invitation is no longer pending.');

  const admin = createAdminClient();
  const { error: emailError } = await admin.auth.admin.inviteUserByEmail(invitation.email, {
    redirectTo: inviteCallbackUrl(invitation.token),
  });

  if (emailError) {
    return ok({ inviteLink: inviteLinkFor(invitation.token) });
  }
  return ok({});
}

export async function revokeInvitation(input: { invitationId: string }): Promise<ActionResult> {
  const { organization, error } = await requireManageMembers();
  if (error) return error;

  const supabase = createClient();
  const { error: updateError } = await supabase
    .from('invitations')
    .update({ status: 'revoked' })
    .eq('id', input.invitationId)
    .eq('organization_id', organization.organizationId);

  if (updateError) return fail(mapDbError(updateError));
  return ok(undefined);
}

export async function changeMemberRole(input: {
  memberId: string;
  role: string;
}): Promise<ActionResult> {
  const parsedRole = roleSchema.safeParse(input.role);
  if (!parsedRole.success) return fail('Invalid role.');

  const { organization, error } = await requireManageMembers();
  if (error) return error;

  if (parsedRole.data === 'owner' && organization.role !== 'owner') {
    return fail('Only an owner can grant the owner role.');
  }

  const supabase = createClient();
  const { error: updateError } = await supabase
    .from('organization_members')
    .update({ role: parsedRole.data as (typeof ALL_ROLES)[number] })
    .eq('id', input.memberId)
    .eq('organization_id', organization.organizationId);

  if (updateError) return fail(mapDbError(updateError));
  return ok(undefined);
}

export async function removeMember(input: { memberId: string }): Promise<ActionResult> {
  const { organization, error } = await requireManageMembers();
  if (error) return error;

  const supabase = createClient();
  const { error: deleteError } = await supabase
    .from('organization_members')
    .delete()
    .eq('id', input.memberId)
    .eq('organization_id', organization.organizationId);

  if (deleteError) return fail(mapDbError(deleteError));

  await supabase.rpc('log_audit_event', {
    p_organization_id: organization.organizationId,
    p_action: 'member_removed',
    p_target_type: 'organization_member',
    p_target_id: input.memberId,
    p_metadata: {},
  });

  return ok(undefined);
}
