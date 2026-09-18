import { createBrowserClient } from '@supabase/ssr';

import type { Database } from './generated';

/**
 * Client-side Supabase client. Safe to use in "use client" components: it
 * only ever holds the public URL and anon key, and access is enforced by
 * Postgres Row Level Security, not by this client.
 */
export function createSupabaseBrowserClient(url: string, anonKey: string) {
  return createBrowserClient<Database>(url, anonKey);
}
