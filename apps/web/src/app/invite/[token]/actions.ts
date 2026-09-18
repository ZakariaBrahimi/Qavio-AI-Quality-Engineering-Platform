'use server';

import { cookies } from 'next/headers';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { CURRENT_ORG_COOKIE, CURRENT_ORG_COOKIE_OPTIONS } from '@/lib/organizations';
import { createClient } from '@/lib/supabase/server';

/**
 * The RPC re-validates everything itself (token, status, expiry, and
 * that the accepting account's email matches the invited one) — see
 * accept_invitation() in supabase/migrations. Its raised exception
 * messages are already written to be shown to a user directly, so
 * they're passed straight through instead of going through a generic
 * error mapper.
 */
export async function acceptInvitation(token: string): Promise<ActionResult<{ organizationId: string }>> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('accept_invitation', { p_token: token });

  if (error || !data) {
    return fail(error?.message ?? 'Could not accept this invitation. Please try again.');
  }

  cookies().set(CURRENT_ORG_COOKIE, data.id, CURRENT_ORG_COOKIE_OPTIONS);
  return ok({ organizationId: data.id });
}
