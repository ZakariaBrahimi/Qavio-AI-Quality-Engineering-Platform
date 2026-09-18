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
