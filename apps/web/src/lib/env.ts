import { createEnv, publicEnvSchema, serverEnvSchema } from '@qavio/config';

/**
 * Validated at call time (not at module scope) so importing this file never
 * fails a build that has no real Supabase project configured yet — see
 * docs/environment-variables.md. Call `getServerEnv()` only from server-only
 * code (route handlers, server actions); `getPublicEnv()` is safe anywhere.
 */
export function getPublicEnv() {
  return createEnv(publicEnvSchema);
}

export function getServerEnv() {
  return createEnv(serverEnvSchema);
}
