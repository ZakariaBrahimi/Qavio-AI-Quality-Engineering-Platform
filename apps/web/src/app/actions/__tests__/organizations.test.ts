import { beforeEach, describe, expect, it, vi } from 'vitest';

import { switchOrganization } from '../organizations';

const mockMaybeSingle = vi.hoisted(() => vi.fn());
const mockCookieSet = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  }),
}));

vi.mock('next/headers', () => ({
  cookies: () => ({ set: mockCookieSet }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('switchOrganization', () => {
  it('switches to an organization the caller actually belongs to', async () => {
    mockMaybeSingle.mockResolvedValue({ data: { organization_id: 'org-1' }, error: null });

    const result = await switchOrganization('org-1');

    expect(result.ok).toBe(true);
    expect(mockCookieSet).toHaveBeenCalledWith('qavio_org_id', 'org-1', expect.any(Object));
  });

  it('refuses to switch to an organization the caller does not belong to, and never sets the cookie', async () => {
    // RLS on organization_members means this query returns no row for
    // an org the caller isn't a member of — not an error, just nothing.
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await switchOrganization('someone-elses-org');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/don't have access/i);
    expect(mockCookieSet).not.toHaveBeenCalled();
  });
});
