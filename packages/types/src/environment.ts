import type { Id, Timestamp } from './common';

/** The deployment tier this environment represents. */
export type EnvironmentKind = 'production' | 'staging' | 'preview' | 'local';

/**
 * How PlaywrightTestExecutor should authenticate before crawling this
 * environment's `baseUrl` — never inferred from the URL, always explicitly
 * set by a Qavio user. See docs/authentication-qa.md.
 *
 * - `none`: no authentication attempted (the default). If the target
 *   redirects to what looks like a login page anyway, the run is marked
 *   `blocked`, not silently passed against the login page.
 * - `stored_state`: `authCredentialId` points at a `playwright_storage_state`
 *   credential — a Playwright `storageState` blob (cookies/localStorage)
 *   captured from an already-authenticated session, applied to this run's
 *   own isolated browser context.
 * - `credentials`: reserved for a future email/password (+ OTP) login flow.
 *   Not implemented by PlaywrightTestExecutor yet — selecting it produces a
 *   `blocked` run with an explicit "not yet implemented" reason, never a
 *   faked login.
 */
export type EnvironmentAuthMethod = 'none' | 'stored_state' | 'credentials';

export interface Environment {
  id: Id;
  organizationId: Id;
  projectId: Id;
  name: string;
  kind: EnvironmentKind;
  baseUrl: string;
  /** Free-form settings (custom headers, viewport, feature flags, …) — a plain object, never an array or scalar. */
  configuration: Record<string, unknown>;
  isDefault: boolean;
  authMethod: EnvironmentAuthMethod;
  /** The credential (in this same project) carrying the secret for `authMethod` — `null` when `authMethod` is `none`. Safe to send to the browser: it's just an id, never the secret itself (see Credential). */
  authCredentialId: Id | null;
  /** Non-null once archived — archiving is a soft delete, never removes the row. */
  archivedAt: Timestamp | null;
  createdBy: Id | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export function isEnvironmentArchived(environment: Pick<Environment, 'archivedAt'>): boolean {
  return environment.archivedAt !== null;
}
