/**
 * Shared shape for every Server Action in this app. Actions never throw
 * on an expected failure (bad input, denied by RLS, a Supabase Auth
 * error) — they return `{ ok: false, error }` with a message that's
 * already safe to show the user, so a client component never has to
 * guess what's safe to render from a caught exception.
 */
export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(error: string): ActionResult<never> {
  return { ok: false, error };
}
