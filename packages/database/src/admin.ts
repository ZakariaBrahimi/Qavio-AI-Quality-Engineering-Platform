import { createClient } from '@supabase/supabase-js';

import type { Database } from './generated';

/**
 * Service-role Supabase client that bypasses Row Level Security entirely.
 * Only ever construct this with `SUPABASE_SERVICE_ROLE_KEY`, and only in
 * server-only code (route handlers, server actions, workers) — never in
 * anything bundled for the browser.
 */
export function createSupabaseAdminClient(url: string, serviceRoleKey: string) {
  return createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
