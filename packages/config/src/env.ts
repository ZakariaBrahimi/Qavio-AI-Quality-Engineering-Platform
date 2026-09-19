import { z } from 'zod';

/**
 * Fails fast with a readable error instead of letting `undefined` leak into
 * runtime code (e.g. an empty Supabase URL silently producing bad requests).
 */
export function createEnv<TSchema extends z.ZodRawShape>(
  schema: TSchema,
  source: Record<string, string | undefined> = process.env,
): z.infer<z.ZodObject<TSchema>> {
  const result = z.object(schema).safeParse(source);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment variables:\n${issues}`);
  }

  return result.data;
}

/**
 * Variables safe to expose to the browser. Every key MUST be prefixed with
 * NEXT_PUBLIC_ so it is never confused with a server secret.
 */
export const publicEnvSchema = {
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
};

/**
 * Server-only variables for the control plane (Next.js server actions,
 * route handlers) — i.e. apps/web. Deliberately does NOT include
 * REDIS_URL: most of apps/web (auth, projects, team management, …) never
 * touches the queue, so requiring it here would make every server action
 * fail validation for infrastructure it doesn't use. The one code path
 * that actually enqueues a Test Run job validates `queueEnvSchema`
 * instead (see below) — narrower on purpose. Never import this schema
 * from a "use client" module.
 */
export const serverEnvSchema = {
  ...publicEnvSchema,
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
};

/**
 * Server-only variable for the control plane's BullMQ *producer* —
 * apps/web/src/lib/queue.ts, the only place in apps/web that enqueues a
 * Test Run job, is the only caller of this schema. Kept separate from
 * `serverEnvSchema` so that the rest of the app (which never touches
 * Redis) isn't forced to have it configured too. Never import this
 * schema from a "use client" module.
 */
export const queueEnvSchema = {
  REDIS_URL: z.string().min(1),
};

/**
 * Variables consumed by background workers (execution plane). Workers never
 * see NEXT_PUBLIC_* variables and never run in a browser context.
 */
export const workerEnvSchema = {
  REDIS_URL: z.string().min(1),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  WORKER_CONCURRENCY: z.coerce.number().int().positive().default(2),
  /** Hard ceiling on one Test Run's execution time — see docs/test-run-engine.md's Timeouts section. A test must not be allowed to run forever. */
  TEST_RUN_TIMEOUT_MS: z.coerce.number().int().positive().default(300_000),
};
