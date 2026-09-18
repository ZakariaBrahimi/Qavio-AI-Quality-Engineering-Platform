import { describe, expect, it } from 'vitest';

import { createSupabaseAdminClient } from '../admin';

describe('createSupabaseAdminClient', () => {
  it('builds a client without making a network call', () => {
    const client = createSupabaseAdminClient('https://example.supabase.co', 'service-role-key');
    expect(client).toBeDefined();
    expect(client.auth).toBeDefined();
  });
});
