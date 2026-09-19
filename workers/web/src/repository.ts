import type { createSupabaseAdminClient, Database } from '@qavio/database';
import { TEST_RUN_QUEUE_NAME, type TestExecutionResultItem } from '@qavio/queue';
import { assertTestRunTransition, type TestRunStatus } from '@qavio/types';

/** Avoids a direct dependency on `@supabase/supabase-js`'s types — workers/web only ever gets a client through `@qavio/database`'s factory. */
export type AdminClient = ReturnType<typeof createSupabaseAdminClient>;
export type TestRunRow = Database['public']['Tables']['test_runs']['Row'];
type TestRunJobStatus = Database['public']['Enums']['test_run_job_status'];

/** Scoped by organization, same "wrong id and someone else's data look identical" rule as the control plane's own `getTestRun`. */
export async function loadTestRun(
  admin: AdminClient,
  organizationId: string,
  testRunId: string,
): Promise<TestRunRow | null> {
  const { data, error } = await admin
    .from('test_runs')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('id', testRunId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load test run ${testRunId}: ${error.message}`);
  }
  return data;
}

/** The worker never trusts a `baseUrl` carried in the job payload — it loads the environment's current one by id instead, scoped to the same org/project the job claims. */
export async function loadEnvironmentBaseUrl(
  admin: AdminClient,
  organizationId: string,
  projectId: string,
  environmentId: string,
): Promise<string | null> {
  const { data, error } = await admin
    .from('environments')
    .select('base_url')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .eq('id', environmentId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load environment ${environmentId}: ${error.message}`);
  }
  return data?.base_url ?? null;
}

export interface TransitionPatch {
  startedAt?: string | null;
  finishedAt?: string | null;
  errorMessage?: string | null;
}

/**
 * The only place `test_runs.status` is written from the execution plane —
 * routes every write through `assertTestRunTransition` (the same map the
 * control plane's `createTestRun`/`cancelTestRun` use), so a worker can
 * never write a status neither side considers legal.
 */
export async function transitionTestRun(
  admin: AdminClient,
  current: TestRunRow,
  to: TestRunStatus,
  patch: TransitionPatch = {},
): Promise<TestRunRow> {
  assertTestRunTransition(current.status, to);

  const { data, error } = await admin
    .from('test_runs')
    .update({
      status: to,
      ...(patch.startedAt !== undefined ? { started_at: patch.startedAt } : {}),
      ...(patch.finishedAt !== undefined ? { finished_at: patch.finishedAt } : {}),
      ...(patch.errorMessage !== undefined ? { error_message: patch.errorMessage } : {}),
    })
    .eq('id', current.id)
    .eq('organization_id', current.organization_id)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to transition test run ${current.id} from ${current.status} to ${to}: ${error.message}`);
  }
  return data;
}

/**
 * Idempotent on retry: always deletes this run's existing results before
 * inserting the fresh set, so a job that runs twice (a BullMQ retry, a
 * crashed-then-resumed worker) never leaves duplicate `test_results` rows
 * behind — see docs/test-run-engine.md's Idempotency section.
 */
export async function writeTestResults(
  admin: AdminClient,
  organizationId: string,
  testRunId: string,
  results: TestExecutionResultItem[],
): Promise<void> {
  const { error: deleteError } = await admin
    .from('test_results')
    .delete()
    .eq('organization_id', organizationId)
    .eq('test_run_id', testRunId);

  if (deleteError) {
    throw new Error(`Failed to clear existing test results for run ${testRunId}: ${deleteError.message}`);
  }

  if (results.length === 0) return;

  const { error: insertError } = await admin.from('test_results').insert(
    results.map((result) => ({
      organization_id: organizationId,
      test_run_id: testRunId,
      test_case_id: null,
      name: result.name,
      status: result.status,
      duration_ms: result.durationMs,
      error_message: result.errorMessage ?? null,
    })),
  );

  if (insertError) {
    throw new Error(`Failed to write test results for run ${testRunId}: ${insertError.message}`);
  }
}

export interface JobRecordUpdate {
  organizationId: string;
  testRunId: string;
  jobId: string;
  status: TestRunJobStatus;
  attempts: number;
  lastError?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
}

/**
 * One row per BullMQ job (`job_id` is unique — see
 * supabase/migrations/20250201001900_test_run_jobs_unique_job_id.sql),
 * upserted on every attempt rather than inserted fresh — so retries update
 * the same row's `attempts`/`last_error`/`status` instead of accumulating
 * a new row each time.
 */
export async function upsertJobRecord(admin: AdminClient, update: JobRecordUpdate): Promise<void> {
  const { error } = await admin.from('test_run_jobs').upsert(
    {
      organization_id: update.organizationId,
      test_run_id: update.testRunId,
      queue_name: TEST_RUN_QUEUE_NAME,
      job_id: update.jobId,
      status: update.status,
      attempts: update.attempts,
      last_error: update.lastError ?? null,
      ...(update.startedAt !== undefined ? { started_at: update.startedAt } : {}),
      ...(update.finishedAt !== undefined ? { finished_at: update.finishedAt } : {}),
    },
    { onConflict: 'job_id' },
  );

  if (error) {
    throw new Error(`Failed to record job ${update.jobId} for test run ${update.testRunId}: ${error.message}`);
  }
}
