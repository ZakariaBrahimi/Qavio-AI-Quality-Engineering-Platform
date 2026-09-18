import { NextRequest, NextResponse } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const mockUpdateSession = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: mockUpdateSession,
}));

const { middleware } = await import('./middleware');

function request(pathname: string) {
  return new NextRequest(new URL(pathname, 'https://app.example.com'));
}

describe('middleware', () => {
  it('redirects an unauthenticated visitor away from a protected route, remembering where they were going', async () => {
    mockUpdateSession.mockResolvedValue({ response: NextResponse.next(), user: null });

    const response = await middleware(request('/overview'));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get('location')!);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe('/overview');
  });

  it('lets an authenticated visitor reach a protected route', async () => {
    mockUpdateSession.mockResolvedValue({
      response: NextResponse.next(),
      user: { id: 'user-1' },
    });

    const response = await middleware(request('/overview'));

    expect(response.headers.get('location')).toBeNull();
  });

  it('bounces an authenticated visitor away from the login page', async () => {
    mockUpdateSession.mockResolvedValue({
      response: NextResponse.next(),
      user: { id: 'user-1' },
    });

    const response = await middleware(request('/login'));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/overview');
  });

  it('never redirects an unauthenticated visitor away from the login page itself', async () => {
    mockUpdateSession.mockResolvedValue({ response: NextResponse.next(), user: null });

    const response = await middleware(request('/login'));

    expect(response.headers.get('location')).toBeNull();
  });

  it('lets an unauthenticated visitor reach an invite link', async () => {
    mockUpdateSession.mockResolvedValue({ response: NextResponse.next(), user: null });

    const response = await middleware(request('/invite/some-token'));

    expect(response.headers.get('location')).toBeNull();
  });

  it('still requires auth for /onboarding, unlike the public auth pages', async () => {
    mockUpdateSession.mockResolvedValue({ response: NextResponse.next(), user: null });

    const response = await middleware(request('/onboarding'));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('location')!).pathname).toBe('/login');
  });

  it('does not bounce a signed-in recovery session away from /reset-password', async () => {
    mockUpdateSession.mockResolvedValue({
      response: NextResponse.next(),
      user: { id: 'user-1' },
    });

    const response = await middleware(request('/reset-password'));

    expect(response.headers.get('location')).toBeNull();
  });
});
