import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

/**
 * PKCE callback for every Supabase Auth email link: signup confirmation,
 * password recovery, and (Phase 3.5+) invite acceptance all point here
 * with a `code` and a `next` describing where to land afterward.
 * Exchanging the code is what actually creates the session — nothing
 * upstream of this route has one yet.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/overview';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL('/login?error=link_expired', url.origin));
}
