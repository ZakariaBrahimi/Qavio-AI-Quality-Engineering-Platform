'use server';

import { cookies } from 'next/headers';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { CURRENT_ORG_COOKIE, CURRENT_ORG_COOKIE_OPTIONS } from '@/lib/organizations';
import { createClient } from '@/lib/supabase/server';

/**
 * Switches the active organization. The requested id is never trusted
 * on its own: this re-queries `organization_members` (RLS-scoped to the
 * caller) for that exact organization id, so the cookie can only ever
 * end up set to an organization the caller actually belongs to.
 */
export async function switchOrganization(organizationId: string): Promise<ActionResult> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error || !data) {
    return fail("You don't have access to that organization.");
  }

  cookies().set(CURRENT_ORG_COOKIE, organizationId, CURRENT_ORG_COOKIE_OPTIONS);
  return ok(undefined);
}
