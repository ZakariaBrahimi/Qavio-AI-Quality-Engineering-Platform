import { beforeEach, describe, expect, it, vi } from 'vitest';

import { acceptInvitation } from '../actions';

const mockRpc = vi.hoisted(() => vi.fn());
const mockCookieSet = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({ rpc: mockRpc }),
}));

vi.mock('next/headers', () => ({
  cookies: () => ({ set: mockCookieSet }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('acceptInvitation', () => {
  it('joins the organization and sets it as current on success', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'org-1', name: 'Acme', slug: 'acme' }, error: null });

    const result = await acceptInvitation('tok-1');

    expect(mockRpc).toHaveBeenCalledWith('accept_invitation', { p_token: 'tok-1' });
    expect(result.ok).toBe(true);
    expect(mockCookieSet).toHaveBeenCalledWith('qavio_org_id', 'org-1', expect.any(Object));
  });

  it('passes through the DB function\'s own validation message (wrong email) without setting a cookie', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'This invitation was sent to a different email address.' },
    });

    const result = await acceptInvitation('tok-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('This invitation was sent to a different email address.');
    expect(mockCookieSet).not.toHaveBeenCalled();
  });

  it('reports an expired invitation', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'This invitation has expired.' } });

    const result = await acceptInvitation('tok-1');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe('This invitation has expired.');
  });
});
