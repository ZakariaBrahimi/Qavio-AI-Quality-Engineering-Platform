import type { Id, Timestamp } from './common';

/**
 * Metadata about the OAuth account behind a connected Integration. The
 * access/refresh tokens themselves are never modeled here — they live in
 * Supabase Vault and are only reachable by workers, via
 * `get_integration_access_token()` (see supabase/migrations).
 */
export interface IntegrationAccount {
  id: Id;
  organizationId: Id;
  integrationId: Id;
  externalAccountId: string;
  externalAccountName: string | null;
  scope: string | null;
  expiresAt: Timestamp | null;
  createdAt: Timestamp;
}
