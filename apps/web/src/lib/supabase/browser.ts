'use client';

import { createSupabaseBrowserClient } from '@qavio/database';

import { getPublicEnv } from '@/lib/env';

let client: ReturnType<typeof createSupabaseBrowserClient> | undefined;

/**
 * Client-side Supabase client for "use client" components. Reuses a
 * single instance across the app instead of creating a new one per
 * render/import.
 */
export function createClient() {
  if (!client) {
    const env = getPublicEnv();
    client = createSupabaseBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }
  return client;
}
