import type { TestResult, TestResultStatus, TestRun, TestRunStatus, TestRunType } from '@qavio/types';

import { createClient } from '@/lib/supabase/server';

interface TestRunRow {
  id: string;
  organization_id: string;
  project_id: string;
  environment_id: string;
  test_suite_id: string | null;
  type: TestRunType;
  status: TestRunStatus;
  configuration: unknown;
  error_message: string | null;
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
    configuration: (row.configuration as Record<string, unknown> | null) ?? {},
    errorMessage: row.error_message,
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

/** Most recent test runs across every project in the organization — for the Test Runs list and the dashboard. Real data only. */
export async function getRecentTestRunsForOrg(organizationId: string, limit = 20): Promise<TestRun[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(toTestRun);
}

/** Total number of test runs across the organization — not capped, for an accurate metric. */
export async function getTestRunCountForOrg(organizationId: string): Promise<number> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from('test_runs')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId);

  if (error || count === null) return 0;
  return count;
}

/** Organization-wide pass/fail breakdown — same two-step shape as `getTestResultSummary`, just without the project_id filter. */
export async function getTestResultSummaryForOrg(organizationId: string): Promise<TestResultSummary> {
  const supabase = createClient();

  const { data: runs, error: runsError } = await supabase
    .from('test_runs')
    .select('id')
    .eq('organization_id', organizationId);

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

/**
 * Average wall-clock duration of finished test runs, in seconds — `null`
 * when there isn't at least one run with both a `started_at` and
 * `finished_at` to measure, so the caller can render "—" instead of a
 * made-up number.
 */
export async function getAverageTestRunDuration(organizationId: string): Promise<number | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('test_runs')
    .select('started_at, finished_at')
    .eq('organization_id', organizationId)
    .not('started_at', 'is', null)
    .not('finished_at', 'is', null);

  if (error || !data || data.length === 0) return null;

  const durationsMs = data
    .map((run) => new Date(run.finished_at as string).getTime() - new Date(run.started_at as string).getTime())
    .filter((ms) => Number.isFinite(ms) && ms >= 0);

  if (durationsMs.length === 0) return null;

  const averageMs = durationsMs.reduce((sum, ms) => sum + ms, 0) / durationsMs.length;
  return Math.round(averageMs / 1000);
}

/**
 * A single test run, scoped to the caller's organization — returns
 * `null` for one that doesn't exist *or* belongs to a different
 * organization, same "wrong id and someone else's data look identical"
 * rule as `getProject`.
 */
export async function getTestRun(organizationId: string, testRunId: string): Promise<TestRun | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', testRunId)
    .maybeSingle();

  if (error || !data) return null;
  return toTestRun(data);
}

interface TestResultRow {
  id: string;
  organization_id: string;
  test_run_id: string;
  test_case_id: string | null;
  name: string;
  status: TestResultStatus;
  duration_ms: number;
  error_message: string | null;
  created_at: string;
}

function toTestResult(row: TestResultRow): TestResult {
  return {
    id: row.id,
    organizationId: row.organization_id,
    testRunId: row.test_run_id,
    testCaseId: row.test_case_id,
    name: row.name,
    status: row.status,
    durationMs: row.duration_ms,
    errorMessage: row.error_message,
    createdAt: row.created_at,
  };
}

/** Every result for one test run, scoped to the caller's organization. */
export async function getTestResults(organizationId: string, testRunId: string): Promise<TestResult[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('test_results')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('test_run_id', testRunId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return data.map(toTestResult);
}
