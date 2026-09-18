import type { Project, ProjectPlatform } from '@qavio/types';

import { createClient } from '@/lib/supabase/server';

interface ProjectRow {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  platform: ProjectPlatform;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function toProject(row: ProjectRow): Project {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    platform: row.platform,
    archivedAt: row.archived_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Every project the caller's organization owns. `organizationId` is
 * still passed explicitly (not inferred from RLS alone) so the query is
 * scoped defensively at both layers — matching the rule everywhere else
 * in this app: never trust a single layer of authorization when a
 * second, cheap check is available. RLS (`is_organization_member`) would
 * already return zero rows for a foreign org id; this makes that
 * explicit rather than incidental.
 */
export async function getProjects(
  organizationId: string,
  options: { includeArchived?: boolean } = {},
): Promise<Project[]> {
  const supabase = createClient();

  let query = supabase
    .from('projects')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (!options.includeArchived) {
    query = query.is('archived_at', null);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(toProject);
}

/**
 * A single project, scoped to the caller's organization. Returns `null`
 * for a project that doesn't exist *or* belongs to a different
 * organization — deliberately the same result either way (see
 * `app/(dashboard)/projects/[id]/page.tsx`, which turns this into a 404
 * regardless of which case it was), so a user can never distinguish
 * "wrong id" from "someone else's project" by probing ids in the URL.
 */
export async function getProject(organizationId: string, projectId: string): Promise<Project | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', projectId)
    .maybeSingle();

  if (error || !data) return null;
  return toProject(data);
}

/**
 * Project id → name, for tables (issues, test runs) that hang off a
 * project but only ever need its name to display, not the full row.
 * Scoped to the caller's organization the same way as everything else
 * here — an id belonging to another org simply won't resolve, matching
 * `getProject`'s "wrong id and someone else's project look the same"
 * rule.
 */
export async function getProjectNameMap(
  organizationId: string,
  projectIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(projectIds)];
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) return map;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('organization_id', organizationId)
    .in('id', uniqueIds);

  if (error || !data) return map;
  for (const row of data) {
    map.set(row.id, row.name);
  }
  return map;
}
