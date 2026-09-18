import { NextResponse, type NextRequest } from 'next/server';

import { updateSession } from '@/lib/supabase/middleware';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/check-email'];

function isPublicAuthPath(pathname: string) {
  return PUBLIC_PATHS.includes(pathname);
}

/**
 * Reachable regardless of auth state, and never force-redirected purely
 * for being an "auth page":
 * - /auth/* — the PKCE callback runs before a session exists.
 * - /invite/[token] — the invitee may not have an account yet.
 * - /reset-password — reached via the recovery email link, which by
 *   then has *created* a session (the recovery session). Treating it as
 *   a "public" auth page would bounce that signed-in recovery session
 *   straight to /dashboard before the user ever sets a new password.
 *
 * /onboarding is deliberately NOT here — it still requires a session
 * (the first branch below), it's just never in PUBLIC_PATHS, so a
 * signed-in user landing there (exactly where someone with zero
 * organizations belongs) is never bounced to /dashboard by the second
 * branch.
 */
function isAlwaysAllowedPath(pathname: string) {
  return (
    pathname.startsWith('/auth/') || pathname.startsWith('/invite/') || pathname === '/reset-password'
  );
}

export async function middleware(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const { pathname } = request.nextUrl;

  if (!user && !isPublicAuthPath(pathname) && !isAlwaysAllowedPath(pathname)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  if (user && isPublicAuthPath(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Every request except static assets and Next.js internals — the
     * Supabase docs' recommended matcher, so the session cookie stays
     * fresh on every navigation, not just ones we explicitly protect.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
