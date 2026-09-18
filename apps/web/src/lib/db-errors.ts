/**
 * Translates a Postgres/PostgREST error from a Row Level Security
 * rejection (or one of our own guardrail triggers) into a message that's
 * safe to show the user — never the raw error, which can include table
 * or policy names.
 */
export function mapDbError(error: { message: string } | null | undefined): string {
  const message = error?.message?.toLowerCase() ?? '';

  if (message.includes('last owner')) {
    return 'An organization must always have at least one owner.';
  }
  if (message.includes('row-level security') || message.includes('permission denied')) {
    return "You don't have permission to do that.";
  }
  if (message.includes('duplicate key') || message.includes('already exists')) {
    return 'That already exists.';
  }

  return 'Something went wrong. Please try again.';
}
