'use server';

import { cookies } from 'next/headers';
import { z } from 'zod';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { CURRENT_ORG_COOKIE, CURRENT_ORG_COOKIE_OPTIONS } from '@/lib/organizations';
import { slugify } from '@/lib/slug';
import { createClient } from '@/lib/supabase/server';

const createOrganizationSchema = z.object({
  name: z
    .string()
    .min(2, 'Organization name must be at least 2 characters')
    .max(80, 'Keep the name under 80 characters'),
});

export async function createOrganization(input: {
  name: string;
}): Promise<ActionResult<{ organizationId: string }>> {
  const parsed = createOrganizationSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const supabase = createClient();
  // A random suffix keeps this from colliding on the common case (two
  // "Acme" orgs) without asking the user to think about slugs at all —
  // "do not add unnecessary onboarding questions" per the Phase 3 spec.
  const slug = `${slugify(parsed.data.name)}-${Math.random().toString(36).slice(2, 6)}`;

  const { data, error } = await supabase.rpc('create_organization', {
    org_name: parsed.data.name,
    org_slug: slug,
  });

  if (error || !data) {
    return fail('Could not create your organization. Please try again.');
  }

  cookies().set(CURRENT_ORG_COOKIE, data.id, CURRENT_ORG_COOKIE_OPTIONS);
  return ok({ organizationId: data.id });
}
