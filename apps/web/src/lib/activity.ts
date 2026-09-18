import { createClient } from '@/lib/supabase/server';

export interface ActivityEntry {
  id: string;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  actorName: string | null;
  createdAt: string;
}

/**
 * Recent `log_audit_event()` rows for the organization — see
 * docs/database.md's "Audit logging" section for which actions are
 * currently logged. RLS restricts this table to admin+ (`"admins can
 * read audit logs"`), so a lower role simply gets an empty array here,
 * not an error; callers gate the section on `hasPermission(role,
 * 'view_audit_log')` so the UI explains why rather than implying nothing
 * has ever happened.
 */
export async function getRecentActivity(organizationId: string, limit = 10): Promise<ActivityEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('audit_logs')
    .select('id, action, target_type, target_id, metadata, actor_id, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];

  const actorIds = [...new Set(data.map((row) => row.actor_id).filter((id): id is string => Boolean(id)))];

  const actorNames = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: profiles } = await supabase.from('profiles').select('id, full_name').in('id', actorIds);
    for (const profile of profiles ?? []) {
      actorNames.set(profile.id, profile.full_name ?? 'A teammate');
    }
  }

  return data.map((row) => ({
    id: row.id,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    metadata: (row.metadata as Record<string, unknown> | null) ?? {},
    actorName: row.actor_id ? (actorNames.get(row.actor_id) ?? 'A former teammate') : null,
    createdAt: row.created_at,
  }));
}
