/**
 * Translates Supabase Auth errors into messages that are safe and useful
 * to show a user — never the raw provider message, which can be overly
 * technical or (for some error types) revealing. Unrecognized errors
 * fall back to a generic message rather than leaking their detail.
 */
export function mapAuthError(error: { message: string } | null | undefined): string {
  const message = error?.message?.toLowerCase() ?? '';

  if (!message) return 'Something went wrong. Please try again.';
  if (message.includes('invalid login credentials')) return 'Invalid email or password.';
  if (message.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (message.includes('email link is invalid') || message.includes('token has expired')) {
    return 'That link has expired or was already used. Please request a new one.';
  }
  if (message.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }
  if (message.includes('user already registered')) {
    return 'An account with that email already exists.';
  }
  if (message.includes('password should be at least') || message.includes('password is too short')) {
    return 'Your password does not meet the minimum requirements.';
  }
  if (message.includes('same as the old password') || message.includes('new password should be different')) {
    return 'Your new password must be different from your current password.';
  }
  if (message.includes('session') && message.includes('expired')) {
    return 'Your session has expired. Please sign in again.';
  }

  return 'Something went wrong. Please try again.';
}
