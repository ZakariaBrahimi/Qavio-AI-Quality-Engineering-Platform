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
 * route handlers). Never import this schema from a "use client" module.
 */
export const serverEnvSchema = {
  ...publicEnvSchema,
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  REDIS_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
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
  PLAYWRIGHT_HEADLESS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((value) => value === 'true'),
};
