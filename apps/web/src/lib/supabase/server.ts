import { createSupabaseServerClient } from '@qavio/database';
import { cookies } from 'next/headers';

import { getPublicEnv } from '@/lib/env';

/**
 * Server-side Supabase client for Server Components, Server Actions, and
 * Route Handlers — respects Row Level Security as the signed-in user.
 *
 * Server Components can't write cookies (Next.js throws), so `setAll` is
 * wrapped in a try/catch there. That's safe: middleware refreshes the
 * session cookie on every request regardless, so a Server Component
 * merely reading a slightly stale (but still valid) cookie has no
 * security effect — it never widens what the user can do.
 */
export function createClient() {
  const env = getPublicEnv();
  const cookieStore = cookies();

  return createSupabaseServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      } catch {
        // Called from a Server Component — see doc comment above.
      }
    },
  });
}
