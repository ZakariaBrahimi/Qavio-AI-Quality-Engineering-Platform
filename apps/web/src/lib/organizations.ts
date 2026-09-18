import type { OrganizationRole } from '@qavio/types';
import { cookies } from 'next/headers';

import { createClient } from '@/lib/supabase/server';

export const CURRENT_ORG_COOKIE = 'qavio_org_id';

/**
 * Shared `cookies().set()` options for the current-org cookie. Not
 * `httpOnly`: the org switcher (a client component) only ever reads it
 * indirectly by re-navigating, but keeping it readable client-side keeps
 * the door open for a client-side-only UI optimization later without
 * having to revisit this. `secure` is skipped outside production so it
 * still works over plain http://localhost in local dev.
 */
export const CURRENT_ORG_COOKIE_OPTIONS = {
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
};

export interface OrganizationMembership {
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  role: OrganizationRole;
}

/** Every organization the signed-in user belongs to, oldest membership first. */
export async function getUserOrganizations(): Promise<OrganizationMembership[]> {
  const supabase = createClient();

  const { data: memberships, error: membershipsError } = await supabase
    .from('organization_members')
    .select('organization_id, role, created_at')
    .order('created_at', { ascending: true });

  if (membershipsError || !memberships || memberships.length === 0) return [];

  const organizationIds = memberships.map((m) => m.organization_id);
  const { data: organizations, error: organizationsError } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .in('id', organizationIds);

  if (organizationsError || !organizations) return [];

  const organizationsById = new Map(organizations.map((org) => [org.id, org]));

  return memberships.flatMap((membership) => {
    const org = organizationsById.get(membership.organization_id);
    if (!org) return [];
    return [
      {
        organizationId: org.id,
        organizationName: org.name,
        organizationSlug: org.slug,
        role: membership.role,
      },
    ];
  });
}

/**
 * Picks the active organization out of a known membership list. Never
 * trusts `cookieOrgId` at face value — it's checked against the caller's
 * real (RLS-scoped) memberships, so a stale, forged, or someone-else's
 * org id just falls back to the first real membership instead of ever
 * being used. Split out from `getCurrentOrganization` so callers who
 * already fetched the membership list (the dashboard layout) don't have
 * to fetch it twice.
 */
export function resolveCurrentOrganization(
  memberships: OrganizationMembership[],
  cookieOrgId: string | undefined,
): OrganizationMembership | null {
  if (memberships.length === 0) return null;

  const match = cookieOrgId
    ? memberships.find((membership) => membership.organizationId === cookieOrgId)
    : undefined;

  return match ?? memberships[0] ?? null;
}

/** The user's active organization for this request — see `resolveCurrentOrganization`. */
export async function getCurrentOrganization(): Promise<OrganizationMembership | null> {
  const memberships = await getUserOrganizations();
  return resolveCurrentOrganization(memberships, cookies().get(CURRENT_ORG_COOKIE)?.value);
}
