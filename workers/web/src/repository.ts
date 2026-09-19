import type { createSupabaseAdminClient, Database, Json } from '@qavio/database';
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

export interface ExecutionTarget {
  baseUrl: string;
  projectPlatform: Database['public']['Enums']['project_platform'];
}

/**
 * What `PlaywrightTestExecutor` needs to know it's allowed to run at all —
 * loaded fresh from the database (never the queue payload), scoped to the
 * organization the job claims, and never assumed: a missing/archived
 * project or environment, or an environment that doesn't actually belong
 * to that project, all come back `null` rather than throwing, so the
 * caller can fail the run with one clear "target not allowed" message
 * instead of leaking a raw query error.
 */
export async function loadExecutionTarget(
  admin: AdminClient,
  organizationId: string,
  projectId: string,
  environmentId: string,
): Promise<ExecutionTarget | null> {
  const [{ data: project, error: projectError }, { data: environment, error: environmentError }] = await Promise.all([
    admin
      .from('projects')
      .select('platform')
      .eq('organization_id', organizationId)
      .eq('id', projectId)
      .is('archived_at', null)
      .maybeSingle(),
    admin
      .from('environments')
      .select('base_url')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('id', environmentId)
      .is('archived_at', null)
      .maybeSingle(),
  ]);

  if (projectError) throw new Error(`Failed to load project ${projectId}: ${projectError.message}`);
  if (environmentError) throw new Error(`Failed to load environment ${environmentId}: ${environmentError.message}`);
  if (!project || !environment) return null;

  return { baseUrl: environment.base_url, projectPlatform: project.platform };
}

/**
 * A short, human-readable status line for the dashboard — never gates a
 * state transition, purely a display hint. Written at a handful of named
 * milestones (not per-page-event), so this rides the same Realtime
 * subscription the status badge already uses without flooding it.
 */
export async function updateProgress(
  admin: AdminClient,
  organizationId: string,
  testRunId: string,
  message: string,
): Promise<void> {
  const { error } = await admin
    .from('test_runs')
    .update({ progress: message })
    .eq('id', testRunId)
    .eq('organization_id', organizationId);

  if (error) {
    throw new Error(`Failed to update progress for test run ${testRunId}: ${error.message}`);
  }
}

export interface TransitionPatch {
  startedAt?: string | null;
  finishedAt?: string | null;
  errorMessage?: string | null;
  summary?: Record<string, unknown>;
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
      ...(patch.summary !== undefined ? { summary: patch.summary as Json } : {}),
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
      id: result.id,
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

export interface ArtifactToWrite {
  resultId: string;
  kind: Database['public']['Enums']['artifact_kind'];
  filename: string;
  contentType: string;
  data: Buffer;
}

/**
 * Uploads each artifact's bytes to the `artifacts` Storage bucket (path
 * convention: `organizations/{orgId}/projects/{projectId}/test-runs/{testRunId}/{filename}`
 * — see supabase/migrations/20250201000700_storage.sql) and records its
 * metadata in the `artifacts` table, referencing the result it belongs
 * to. Uploads are attempted independently — one failed upload doesn't
 * block persisting the others; every failure is collected and thrown
 * together so the caller sees the whole picture, not just the first one.
 *
 * Not fully idempotent on a retry: a re-run's fresh `test_results` rows
 * (new client-generated ids) mean the old artifact *rows* are cascade-
 * deleted automatically when `writeTestResults` clears the previous
 * attempt's results, but the old attempt's Storage *blobs* are not
 * proactively deleted — a bounded, documented resource leak on retry
 * (rare), not a correctness issue: nothing ever displays or references
 * an orphaned blob, since its DB row is gone.
 */
export async function writeArtifacts(
  admin: AdminClient,
  organizationId: string,
  projectId: string,
  testRunId: string,
  artifacts: ArtifactToWrite[],
): Promise<void> {
  if (artifacts.length === 0) return;

  const errors: string[] = [];

  await Promise.all(
    artifacts.map(async (artifact) => {
      const storagePath = `organizations/${organizationId}/projects/${projectId}/test-runs/${testRunId}/${artifact.filename}`;

      const { error: uploadError } = await admin.storage.from('artifacts').upload(storagePath, artifact.data, {
        contentType: artifact.contentType,
        upsert: false,
      });
      if (uploadError) {
        errors.push(`upload ${artifact.filename}: ${uploadError.message}`);
        return;
      }

      const { error: insertError } = await admin.from('artifacts').insert({
        organization_id: organizationId,
        test_result_id: artifact.resultId,
        kind: artifact.kind,
        storage_bucket: 'artifacts',
        storage_path: storagePath,
        content_type: artifact.contentType,
        size_bytes: artifact.data.byteLength,
      });
      if (insertError) {
        errors.push(`record ${artifact.filename}: ${insertError.message}`);
      }
    }),
  );

  if (errors.length > 0) {
    throw new Error(`Failed to write ${errors.length} of ${artifacts.length} artifact(s): ${errors.join('; ')}`);
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
