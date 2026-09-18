import type { Environment, EnvironmentKind } from '@qavio/types';

import { createClient } from '@/lib/supabase/server';

interface EnvironmentRow {
  id: string;
  organization_id: string;
  project_id: string;
  name: string;
  kind: EnvironmentKind;
  base_url: string;
  configuration: unknown;
  is_default: boolean;
  archived_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function toEnvironment(row: EnvironmentRow): Environment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    name: row.name,
    kind: row.kind,
    baseUrl: row.base_url,
    configuration: (row.configuration as Record<string, unknown> | null) ?? {},
    isDefault: row.is_default,
    archivedAt: row.archived_at,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Every environment for a project, scoped to the caller's organization — see `getProjects` for why both filters are applied. */
export async function getEnvironments(
  organizationId: string,
  projectId: string,
  options: { includeArchived?: boolean } = {},
): Promise<Environment[]> {
  const supabase = createClient();

  let query = supabase
    .from('environments')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });

  if (!options.includeArchived) {
    query = query.is('archived_at', null);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(toEnvironment);
}

/**
 * Read-only credential counts per environment for display ("2
 * credentials configured") — never the credentials themselves, and
 * never a secret value (which isn't reachable through this client at
 * all, see get_credential_secret() in supabase/migrations). Credentials
 * are admin+-only per RLS, so this silently comes back empty for
 * anyone below admin instead of erroring — the caller just won't show a
 * count, which is the correct behavior for a viewer/developer/qa role.
 */
export async function getCredentialCountsByEnvironment(
  organizationId: string,
  projectId: string,
): Promise<Map<string, number>> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('credentials')
    .select('environment_id')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .not('environment_id', 'is', null);

  const counts = new Map<string, number>();
  if (error || !data) return counts;

  for (const row of data) {
    if (!row.environment_id) continue;
    counts.set(row.environment_id, (counts.get(row.environment_id) ?? 0) + 1);
  }
  return counts;
}

/** Environment id → name, for tables that only need to display which environment a row ran against. Org-scoped like every other helper here. */
export async function getEnvironmentNameMap(
  organizationId: string,
  environmentIds: string[],
): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(environmentIds)];
  const map = new Map<string, string>();
  if (uniqueIds.length === 0) return map;

  const supabase = createClient();
  const { data, error } = await supabase
    .from('environments')
    .select('id, name')
    .eq('organization_id', organizationId)
    .in('id', uniqueIds);

  if (error || !data) return map;
  for (const row of data) {
    map.set(row.id, row.name);
  }
  return map;
}
