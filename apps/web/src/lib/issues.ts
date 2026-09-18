import type { Issue, IssueEvidence, IssueSeverity, IssueStatus } from '@qavio/types';

import { createClient } from '@/lib/supabase/server';

interface IssueRow {
  id: string;
  organization_id: string;
  project_id: string;
  test_run_id: string | null;
  test_result_id: string | null;
  title: string;
  description: string | null;
  severity: IssueSeverity;
  status: IssueStatus;
  evidence: unknown;
  ai_summary: string | null;
  external_issue_url: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
}

function toIssue(row: IssueRow): Issue {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    testRunId: row.test_run_id,
    testResultId: row.test_result_id,
    title: row.title,
    description: row.description,
    severity: row.severity,
    status: row.status,
    evidence: (row.evidence as IssueEvidence[] | null) ?? [],
    aiSummary: row.ai_summary,
    externalIssueUrl: row.external_issue_url,
    assignedTo: row.assigned_to,
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

/** Most recently created open-ish issues for a project. Real data only. */
export async function getRecentIssues(
  organizationId: string,
  projectId: string,
  limit = 5,
): Promise<Issue[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(toIssue);
}

/**
 * A single issue, scoped to the caller's organization — `null` for one
 * that doesn't exist *or* belongs to a different organization, same
 * "wrong id and someone else's data look identical" rule as
 * `getProject`.
 */
export async function getIssue(organizationId: string, issueId: string): Promise<Issue | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', issueId)
    .maybeSingle();

  if (error || !data) return null;
  return toIssue(data);
}

/** Every issue across the whole organization (every project), most recent first — for the Issues page. Real data only. */
export async function getIssuesForOrg(organizationId: string, limit = 100): Promise<Issue[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('issues')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(toIssue);
}

const UNRESOLVED_STATUSES: IssueStatus[] = ['open', 'in_progress', 'reopened'];

export interface IssueCounts {
  open: number;
  critical: number;
  unresolvedHigh: number;
  resolved: number;
  total: number;
}

const EMPTY_ISSUE_COUNTS: IssueCounts = { open: 0, critical: 0, unresolvedHigh: 0, resolved: 0, total: 0 };

/**
 * Accurate organization-wide issue counts for metric cards — not capped
 * like `getIssuesForOrg`/`getRecentIssues`, so the number is right even
 * once an organization has more issues than any list view shows.
 */
export async function getIssueCounts(organizationId: string): Promise<IssueCounts> {
  const supabase = createClient();

  const [openResult, criticalResult, highResult, resolvedResult, totalResult] = await Promise.all([
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .in('status', UNRESOLVED_STATUSES),
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('severity', 'critical')
      .in('status', UNRESOLVED_STATUSES),
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('severity', 'high')
      .in('status', UNRESOLVED_STATUSES),
    supabase
      .from('issues')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', organizationId)
      .eq('status', 'resolved'),
    supabase.from('issues').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
  ]);

  if (
    openResult.error ||
    criticalResult.error ||
    highResult.error ||
    resolvedResult.error ||
    totalResult.error
  ) {
    return EMPTY_ISSUE_COUNTS;
  }

  return {
    open: openResult.count ?? 0,
    critical: criticalResult.count ?? 0,
    unresolvedHigh: highResult.count ?? 0,
    resolved: resolvedResult.count ?? 0,
    total: totalResult.count ?? 0,
  };
}
