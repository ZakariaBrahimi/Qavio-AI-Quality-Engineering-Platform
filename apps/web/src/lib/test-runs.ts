import type { TestResultStatus, TestRun, TestRunStatus, TestRunType } from '@qavio/types';

import { createClient } from '@/lib/supabase/server';

interface TestRunRow {
  id: string;
  organization_id: string;
  project_id: string;
  environment_id: string;
  test_suite_id: string | null;
  type: TestRunType;
  status: TestRunStatus;
  triggered_by: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

function toTestRun(row: TestRunRow): TestRun {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id,
    environmentId: row.environment_id,
    testSuiteId: row.test_suite_id,
    type: row.type,
    status: row.status,
    triggeredBy: row.triggered_by,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    createdAt: row.created_at,
  };
}

/** Most recent test runs for a project, optionally scoped to one environment. Real data only — an empty array means exactly that. */
export async function getRecentTestRuns(
  organizationId: string,
  projectId: string,
  options: { environmentId?: string; limit?: number } = {},
): Promise<TestRun[]> {
  const supabase = createClient();

  let query = supabase
    .from('test_runs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(options.limit ?? 5);

  if (options.environmentId) {
    query = query.eq('environment_id', options.environmentId);
  }

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map(toTestRun);
}

/** Total number of test runs for a project — not capped like `getRecentTestRuns`, for an accurate metric. */
export async function getTestRunCount(
  organizationId: string,
  projectId: string,
  options: { environmentId?: string } = {},
): Promise<number> {
  const supabase = createClient();

  let query = supabase
    .from('test_runs')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('project_id', projectId);

  if (options.environmentId) {
    query = query.eq('environment_id', options.environmentId);
  }

  const { count, error } = await query;
  if (error || count === null) return 0;
  return count;
}

export interface TestResultSummary {
  passed: number;
  failed: number;
  skipped: number;
  blocked: number;
  total: number;
}

const EMPTY_SUMMARY: TestResultSummary = { passed: 0, failed: 0, skipped: 0, blocked: 0, total: 0 };

/**
 * Pass/fail counts across a project's test results. `test_results` has
 * no `project_id` of its own (it hangs off `test_run_id`), so this is
 * necessarily two queries: which runs belong to this project (and
 * environment, if given), then how their results break down by status.
 * Never fabricated — a project with no runs yet gets back all zeros,
 * not a made-up rate.
 */
export async function getTestResultSummary(
  organizationId: string,
  projectId: string,
  options: { environmentId?: string } = {},
): Promise<TestResultSummary> {
  const supabase = createClient();

  let runsQuery = supabase
    .from('test_runs')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId);

  if (options.environmentId) {
    runsQuery = runsQuery.eq('environment_id', options.environmentId);
  }

  const { data: runs, error: runsError } = await runsQuery;
  if (runsError || !runs || runs.length === 0) return EMPTY_SUMMARY;

  const runIds = runs.map((run) => run.id);
  const { data: results, error: resultsError } = await supabase
    .from('test_results')
    .select('status')
    .eq('organization_id', organizationId)
    .in('test_run_id', runIds);

  if (resultsError || !results) return EMPTY_SUMMARY;

  const summary: TestResultSummary = { ...EMPTY_SUMMARY };
  for (const result of results as { status: TestResultStatus }[]) {
    summary[result.status] += 1;
    summary.total += 1;
  }
  return summary;
}
