import { createSupabaseAdminClient } from '@qavio/database';

import { getServerEnv } from '@/lib/env';

/**
 * Service-role Supabase client. Bypasses Row Level Security — only ever
 * import this from server-only code (a "use server" action or a route
 * handler), and only for operations that genuinely need it: today,
 * `auth.admin.inviteUserByEmail` (creating an invited user's auth account
 * and sending Supabase's own invite email), and `create_credential_secret`
 * (the only way a credential's secret value — e.g. a Playwright
 * `storageState`, see projects/[id]/actions.ts's
 * `saveEnvironmentStoredState`) — ever reaches Vault, since that RPC is
 * deliberately granted to `service_role` only, not `authenticated`. Never
 * use this to read or write tenant data that RLS should be gating.
 */
export function createAdminClient() {
  const env = getServerEnv();
  return createSupabaseAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
}
