'use server';

import {
  forgotPasswordSchema,
  loginSchema,
  resetPasswordSchema,
  signupSchema,
} from '@/lib/auth-schemas';
import { fail, ok, type ActionResult } from '@/lib/action-result';
import { mapAuthError } from '@/lib/auth-errors';
import { getPublicEnv } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

function callbackUrl(next: string) {
  const appUrl = getPublicEnv().NEXT_PUBLIC_APP_URL;
  return `${appUrl}/auth/callback?next=${encodeURIComponent(next)}`;
}

export async function signUp(
  input: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
  },
  /** Where to land after confirming — e.g. `/invite/<token>` when signing up from an invite link. */
  next = '/onboarding',
): Promise<ActionResult> {
  const parsed = signupSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: callbackUrl(next.startsWith('/') ? next : '/onboarding'),
    },
  });

  // Supabase deliberately reports success even for an email that's
  // already registered (so signup can't be used to enumerate accounts) —
  // there is nothing case-specific to branch on here.
  if (error) return fail(mapAuthError(error));
  return ok(undefined);
}

export async function signIn(input: { email: string; password: string }): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) return fail(mapAuthError(error));
  return ok(undefined);
}

export async function signOut(): Promise<ActionResult> {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) return fail(mapAuthError(error));
  return ok(undefined);
}

export async function requestPasswordReset(input: { email: string }): Promise<ActionResult> {
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl('/reset-password'),
  });

  // Same anti-enumeration rule as signUp: a reset request always looks
  // successful from the outside, whether or not that email has an
  // account. Only a real failure (rate limit, network) is reported.
  if (error) return fail(mapAuthError(error));
  return ok(undefined);
}

export async function updatePassword(input: {
  password: string;
  confirmPassword: string;
}): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return fail('That link has expired or was already used. Please request a new one.');
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return fail(mapAuthError(error));
  return ok(undefined);
}
