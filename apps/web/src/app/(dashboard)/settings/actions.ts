'use server';

import { z } from 'zod';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { mapDbError } from '@/lib/db-errors';
import { getCurrentOrganization } from '@/lib/organizations';
import { hasPermission } from '@/lib/rbac';
import { createClient } from '@/lib/supabase/server';

const organizationNameSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(80, 'Keep it under 80 characters'),
});

export async function updateOrganizationName(input: { name: string }): Promise<ActionResult> {
  const parsed = organizationNameSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const organization = await getCurrentOrganization();
  if (!organization) return fail('No active organization.');
  if (!hasPermission(organization.role, 'manage_organization')) {
    return fail("You don't have permission to update this organization.");
  }

  const supabase = createClient();
  const { error } = await supabase
    .from('organizations')
    .update({ name: parsed.data.name })
    .eq('id', organization.organizationId);

  if (error) return fail(mapDbError(error));
  return ok(undefined);
}

const profileSchema = z.object({
  fullName: z.string().min(1, 'Name is required').max(100, 'Keep it under 100 characters'),
});

export async function updateProfile(input: { fullName: string }): Promise<ActionResult> {
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('You are not signed in.');

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: parsed.data.fullName })
    .eq('id', user.id);

  if (error) return fail(mapDbError(error));
  return ok(undefined);
}
