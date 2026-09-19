import { createEnv, publicEnvSchema, queueEnvSchema, serverEnvSchema } from '@qavio/config';

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

/**
 * Only `src/lib/queue.ts` (the BullMQ producer) calls this — every other
 * server action keeps using `getServerEnv()`, which doesn't require Redis.
 */
export function getQueueEnv() {
  return createEnv(queueEnvSchema);
}
