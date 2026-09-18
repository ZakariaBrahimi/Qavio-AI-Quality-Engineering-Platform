import { createServerClient } from '@supabase/ssr';

import type { Database } from './generated';

/**
 * Minimal cookie adapter, matching the shape Next.js's `cookies()` already
 * satisfies. Kept as an explicit interface (instead of importing `next/headers`
 * here) so this package never depends on Next.js.
 */
export interface CookieAdapter {
  getAll(): { name: string; value: string }[];
  setAll(cookies: { name: string; value: string; options?: Record<string, unknown> }[]): void;
}

/**
 * Server-side Supabase client scoped to the requesting user's session
 * (respects Row Level Security). Use this in server components, server
 * actions, and route handlers — never the admin client — unless the
 * operation truly requires bypassing RLS.
 */
export function createSupabaseServerClient(url: string, anonKey: string, cookies: CookieAdapter) {
  return createServerClient<Database>(url, anonKey, { cookies });
}
