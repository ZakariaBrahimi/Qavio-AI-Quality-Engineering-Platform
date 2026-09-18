import { beforeEach, describe, expect, it, vi } from 'vitest';

import { requestPasswordReset, signIn, signOut, signUp, updatePassword } from '../actions';

// vi.mock factories run before ordinary top-level statements (they're
// hoisted alongside the mock registration itself), so the shared mock
// object they close over must come from vi.hoisted — a plain `const`
// here would still be in its temporal dead zone when the factory below
// actually runs.
const mockAuth = vi.hoisted(() => ({
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ auth: mockAuth }),
}));

vi.mock('@/lib/env', () => ({
  getPublicEnv: () => ({ NEXT_PUBLIC_APP_URL: 'https://app.example.com' }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('signUp', () => {
  it('rejects invalid input before calling Supabase', async () => {
    const result = await signUp({
      fullName: '',
      email: 'not-an-email',
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.ok).toBe(false);
    expect(mockAuth.signUp).not.toHaveBeenCalled();
  });

  it('signs up with a callback redirect and succeeds even if Supabase reports no error', async () => {
    mockAuth.signUp.mockResolvedValue({ error: null });
    const result = await signUp({
      fullName: 'Jane Smith',
      email: 'jane@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.ok).toBe(true);
    expect(mockAuth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'jane@example.com',
        options: expect.objectContaining({
          emailRedirectTo: 'https://app.example.com/auth/callback?next=%2Fonboarding',
        }),
      }),
    );
  });

  it('routes the invite flow to /invite/<token> instead of /onboarding', async () => {
    mockAuth.signUp.mockResolvedValue({ error: null });
    await signUp(
      { fullName: 'Jane', email: 'jane@example.com', password: 'password123', confirmPassword: 'password123' },
      '/invite/abc-123',
    );
    expect(mockAuth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          emailRedirectTo: expect.stringContaining(encodeURIComponent('/invite/abc-123')),
        }),
      }),
    );
  });

  it('maps a Supabase error to a safe message', async () => {
    mockAuth.signUp.mockResolvedValue({ error: { message: 'Email rate limit exceeded' } });
    const result = await signUp({
      fullName: 'Jane',
      email: 'jane@example.com',
      password: 'password123',
      confirmPassword: 'password123',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/too many attempts/i);
  });
});

describe('signIn', () => {
  it('rejects an empty password before calling Supabase', async () => {
    const result = await signIn({ email: 'jane@example.com', password: '' });
    expect(result.ok).toBe(false);
    expect(mockAuth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('never exposes the raw provider error for bad credentials', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    });
    const result = await signIn({ email: 'jane@example.com', password: 'wrong-password' });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Invalid email or password.');
      expect(result.error.toLowerCase()).not.toContain('credentials');
    }
  });

  it('succeeds when Supabase reports no error', async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null });
    const result = await signIn({ email: 'jane@example.com', password: 'password123' });
    expect(result.ok).toBe(true);
  });
});

describe('signOut', () => {
  it('calls supabase.auth.signOut', async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    const result = await signOut();
    expect(result.ok).toBe(true);
    expect(mockAuth.signOut).toHaveBeenCalledTimes(1);
  });
});

describe('requestPasswordReset', () => {
  it('looks successful even for a failure Supabase intentionally hides (anti-enumeration)', async () => {
    // Supabase returns no error for an unknown email on purpose; this
    // action must not try to distinguish that from a known one.
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
    const result = await requestPasswordReset({ email: 'nobody@example.com' });
    expect(result.ok).toBe(true);
  });

  it('reports a real failure (e.g. rate limit)', async () => {
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: { message: 'rate limit exceeded' } });
    const result = await requestPasswordReset({ email: 'jane@example.com' });
    expect(result.ok).toBe(false);
  });
});

describe('updatePassword', () => {
  it('refuses when there is no session (expired/used recovery link)', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    const result = await updatePassword({ password: 'newpassword123', confirmPassword: 'newpassword123' });
    expect(result.ok).toBe(false);
    expect(mockAuth.updateUser).not.toHaveBeenCalled();
  });

  it('updates the password when a recovery session exists', async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mockAuth.updateUser.mockResolvedValue({ error: null });
    const result = await updatePassword({ password: 'newpassword123', confirmPassword: 'newpassword123' });
    expect(result.ok).toBe(true);
    expect(mockAuth.updateUser).toHaveBeenCalledWith({ password: 'newpassword123' });
  });

  it('rejects mismatched passwords before touching Supabase', async () => {
    const result = await updatePassword({ password: 'newpassword123', confirmPassword: 'different' });
    expect(result.ok).toBe(false);
    expect(mockAuth.getUser).not.toHaveBeenCalled();
  });
});
