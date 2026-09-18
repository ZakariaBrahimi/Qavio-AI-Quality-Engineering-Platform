import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createOrganization } from '../actions';

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

describe('createOrganization', () => {
  it('rejects a too-short name before calling Supabase', async () => {
    const result = await createOrganization({ name: 'A' });
    expect(result.ok).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('calls create_organization with a slugified, deduplicated slug', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'org-1', name: 'Acme Inc.', slug: 'acme-inc-ab12' }, error: null });

    const result = await createOrganization({ name: 'Acme Inc.' });

    expect(result.ok).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith(
      'create_organization',
      expect.objectContaining({
        org_name: 'Acme Inc.',
        org_slug: expect.stringMatching(/^acme-inc-[a-z0-9]{4}$/),
      }),
    );
  });

  it('sets the current-org cookie to the newly created organization', async () => {
    mockRpc.mockResolvedValue({ data: { id: 'org-1', name: 'Acme', slug: 'acme-ab12' }, error: null });

    await createOrganization({ name: 'Acme' });

    expect(mockCookieSet).toHaveBeenCalledWith('qavio_org_id', 'org-1', expect.any(Object));
  });

  it('reports a failure without setting a cookie', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'duplicate key' } });

    const result = await createOrganization({ name: 'Acme' });

    expect(result.ok).toBe(false);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });
});
