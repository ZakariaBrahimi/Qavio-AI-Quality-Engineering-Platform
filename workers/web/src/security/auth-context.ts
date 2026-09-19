import type { PlaywrightStorageState } from '../browser-manager';

/**
 * Turns an environment's `auth_method`/`auth_credential_id` into something
 * `PlaywrightTestExecutor` can actually use — resolved fresh per run,
 * never carried in the BullMQ payload, same pattern as `loadExecutionTarget`.
 *
 * `unavailable` is not an error to throw: it's a normal outcome (no
 * credential attached, a method not implemented yet, a malformed stored
 * state) that the executor turns into a `blocked` Test Run with `reason`
 * as the evidence — never a faked login, never a silently-passed check.
 */
export type AuthResolution =
  | { kind: 'none' }
  | { kind: 'stored_state'; storageState: PlaywrightStorageState }
  | { kind: 'unavailable'; reason: string };

export interface AuthContextDeps {
  /** Loads the raw secret text for a credential, already scoped to the run's own organization/project — see repository.loadCredentialSecret. Returns `null` if the credential doesn't exist or doesn't belong to this org/project. */
  loadCredentialSecret(credentialId: string): Promise<string | null>;
}

/** A Playwright `storageState` is, at minimum, `{ cookies: [...] }` — `origins` (localStorage) is optional. Rejects anything else without ever including the parsed content in an error message. */
function parseStorageState(raw: string): PlaywrightStorageState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const candidate = parsed as Record<string, unknown>;
  if (!Array.isArray(candidate.cookies)) return null;
  if (candidate.origins !== undefined && !Array.isArray(candidate.origins)) return null;

  return candidate as unknown as PlaywrightStorageState;
}

/**
 * Recognizes a small, curated set of conventional login-page path shapes
 * (`/login`, `/auth/login`, `/signin`, `/sign-in`, `/account/login`,
 * `/users/sign_in`, …) — deliberately narrow rather than "contains login
 * anywhere", to avoid false-positiving on a legitimate page that happens
 * to mention login (a docs page at `/help/login-issues`, say). This is
 * evidence a page IS a login boundary, not a claim about WHY a redirect
 * happened or HOW to authenticate — it never infers credentials, it only
 * flags the shape of where the crawler ended up. See docs/authentication-qa.md.
 */
const AUTH_BOUNDARY_PATH_PATTERN =
  /^\/(?:[a-z0-9_-]+\/)?(?:log[-_]?in|sign[-_]?in|sso|authenticate)\/?$/i;

export function looksLikeAuthBoundary(url: URL): boolean {
  return AUTH_BOUNDARY_PATH_PATTERN.test(url.pathname);
}

export async function resolveAuthContext(
  deps: AuthContextDeps,
  authMethod: 'none' | 'stored_state' | 'credentials',
  authCredentialId: string | null,
): Promise<AuthResolution> {
  if (authMethod === 'none') {
    return { kind: 'none' };
  }

  if (authMethod === 'credentials') {
    // Never faked: packages/types/src/credential.ts's `login_credentials`
    // type exists so this is a stable, modeled choice, but
    // PlaywrightTestExecutor has no email/password/OTP flow to run yet —
    // see docs/authentication-qa.md for why this is deliberate, not an
    // oversight.
    return {
      kind: 'unavailable',
      reason: 'Credential-based login is not yet implemented for this environment. Configure a pre-authenticated storage state instead.',
    };
  }

  // authMethod === 'stored_state'
  if (!authCredentialId) {
    return {
      kind: 'unavailable',
      reason: "This environment's authentication method is 'stored_state' but no credential is attached.",
    };
  }

  const secret = await deps.loadCredentialSecret(authCredentialId);
  if (secret === null) {
    return {
      kind: 'unavailable',
      reason: 'The configured authentication credential could not be found for this organization/project.',
    };
  }

  const storageState = parseStorageState(secret);
  if (!storageState) {
    return {
      kind: 'unavailable',
      reason: "The configured authentication credential's stored state is malformed and could not be used.",
    };
  }

  return { kind: 'stored_state', storageState };
}
