import type { Id, Timestamp } from './common';

export type CredentialType =
  | 'api_key'
  | 'basic_auth'
  | 'oauth_token'
  | 'ssh_key'
  | 'generic'
  /** The secret value is a Playwright `storageState` JSON blob (cookies + localStorage) from an already-authenticated session — see `Environment.authMethod: 'stored_state'` and workers/web's browser-manager.ts. */
  | 'playwright_storage_state'
  /** Reserved for a future email/password (+ OTP) login flow — see `Environment.authMethod: 'credentials'`. Not read by PlaywrightTestExecutor yet. */
  | 'login_credentials';

/**
 * Metadata about a secret a test run needs to reach a target environment.
 * The secret value itself is never modeled here — it lives in Supabase
 * Vault and is only reachable by workers, via `get_credential_secret()`
 * (see supabase/migrations). This type is safe to send to the browser;
 * nothing that resolves to a real secret ever is.
 */
export interface Credential {
  id: Id;
  organizationId: Id;
  projectId: Id;
  environmentId: Id | null;
  name: string;
  type: CredentialType;
  createdBy: Id | null;
  createdAt: Timestamp;
  rotatedAt: Timestamp | null;
}
