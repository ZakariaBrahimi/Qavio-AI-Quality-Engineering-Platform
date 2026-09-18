import { createSupabaseAdminClient } from '@qavio/database';

import { getServerEnv } from '@/lib/env';

/**
 * Service-role Supabase client. Bypasses Row Level Security — only ever
 * import this from server-only code (a "use server" action or a route
 * handler), and only for operations that genuinely need it (today: just
 * `auth.admin.inviteUserByEmail`, to create the invited user's auth
 * account and send Supabase's own invite email). Never use this to read
 * or write tenant data that RLS should be gating.
 */
export function createAdminClient() {
  const env = getServerEnv();
  return createSupabaseAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}
