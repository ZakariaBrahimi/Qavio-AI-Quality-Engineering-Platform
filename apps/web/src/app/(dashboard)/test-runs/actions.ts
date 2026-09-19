'use server';

import { assertTestRunTransition, canTransitionTestRunStatus } from '@qavio/types';
import { z } from 'zod';

import { fail, ok, type ActionResult } from '@/lib/action-result';
import { mapDbError } from '@/lib/db-errors';
import { getCurrentOrganization } from '@/lib/organizations';
import { enqueueTestRun as enqueueTestRunJob, removeQueuedTestRunJob } from '@/lib/queue';
import { hasPermission } from '@/lib/rbac';
import { createClient } from '@/lib/supabase/server';

const createTestRunSchema = z.object({
  projectId: z.string().uuid(),
  environmentId: z.string().uuid(),
  type: z.enum(['functional', 'visual', 'responsive', 'security']),
});

/**
 * Creates a real `test_runs` row and hands it to the BullMQ queue —
 * Qavio Web -> Supabase -> BullMQ -> Redis -> Web Worker, see
 * docs/test-run-engine.md. Every check here (membership, permission,
 * project/environment ownership) is UI convenience; RLS is the actual
 * boundary that would reject the insert regardless (see rbac.ts).
 */
export async function createTestRun(input: {
  projectId: string;
  environmentId: string;
  type: string;
}): Promise<ActionResult<{ testRunId: string }>> {
  const parsed = createTestRunSchema.safeParse(input);
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid input.');

  const organization = await getCurrentOrganization();
  if (!organization) return fail('No active organization.');
  if (!hasPermission(organization.role, 'manage_test_workflows')) {
    return fail("You don't have permission to start test runs.");
  }

  const supabase = createClient();

  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', parsed.data.projectId)
    .eq('organization_id', organization.organizationId)
    .is('archived_at', null)
    .maybeSingle();
  if (projectError) return fail(mapDbError(projectError));
  if (!project) return fail('Project not found.');

  const { data: environment, error: environmentError } = await supabase
    .from('environments')
    .select('id')
    .eq('id', parsed.data.environmentId)
    .eq('project_id', parsed.data.projectId)
    .eq('organization_id', organization.organizationId)
    .is('archived_at', null)
    .maybeSingle();
  if (environmentError) return fail(mapDbError(environmentError));
  if (!environment) return fail('That environment does not belong to this project.');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: testRun, error: insertError } = await supabase
    .from('test_runs')
    .insert({
      organization_id: organization.organizationId,
      project_id: parsed.data.projectId,
      environment_id: parsed.data.environmentId,
      type: parsed.data.type,
      status: 'created',
      triggered_by: user?.id ?? null,
    })
    .select('id')
    .single();

  if (insertError || !testRun) return fail(mapDbError(insertError));

  try {
    await enqueueTestRunJob({
      testRunId: testRun.id,
      organizationId: organization.organizationId,
      projectId: parsed.data.projectId,
      environmentId: parsed.data.environmentId,
      type: parsed.data.type,
    });
  } catch (queueError) {
    // The database stays the source of truth: a run that never made it
    // onto the queue must not sit stuck in `created` forever.
    // eslint-disable-next-line no-console
    console.error('Failed to enqueue test run', testRun.id, queueError);

    await supabase
      .from('test_runs')
      .update({
        status: 'failed',
        error_message: 'Failed to queue this test run. Please try again.',
        finished_at: new Date().toISOString(),
      })
      .eq('id', testRun.id)
      .eq('organization_id', organization.organizationId);

    return fail('Failed to queue this test run. Please try again.');
  }

  assertTestRunTransition('created', 'queued');
  const { error: queuedError } = await supabase
    .from('test_runs')
    .update({ status: 'queued' })
    .eq('id', testRun.id)
    .eq('organization_id', organization.organizationId);

  if (queuedError) {
    // The job already exists in Redis at this point — the worker will
    // still pick it up and can move the run forward on its own, so this
    // is logged rather than surfaced as a failure to the caller.
    // eslint-disable-next-line no-console
    console.error('Failed to mark test run as queued', testRun.id, queuedError);
  }

  await supabase.rpc('log_audit_event', {
    p_organization_id: organization.organizationId,
    p_action: 'test_run_created',
    p_target_type: 'test_run',
    p_target_id: testRun.id,
    p_metadata: {
      project_id: parsed.data.projectId,
      environment_id: parsed.data.environmentId,
      type: parsed.data.type,
    },
  });

  return ok({ testRunId: testRun.id });
}

/**
 * Cancels a queued or running Test Run. A queued job that a worker hasn't
 * picked up yet is actually removed from Redis; a job already running
 * can't be forcibly stopped in this phase (see docs/test-run-engine.md's
 * Cancellation section) — the database status still moves to `cancelled`
 * either way, which is what the UI (and, on its next status check, the
 * worker itself) honors as the source of truth.
 */
export async function cancelTestRun(input: { testRunId: string }): Promise<ActionResult> {
  const organization = await getCurrentOrganization();
  if (!organization) return fail('No active organization.');
  if (!hasPermission(organization.role, 'manage_test_workflows')) {
    return fail("You don't have permission to cancel test runs.");
  }

  const supabase = createClient();
  const { data: testRun, error: loadError } = await supabase
    .from('test_runs')
    .select('id, status')
    .eq('id', input.testRunId)
    .eq('organization_id', organization.organizationId)
    .maybeSingle();

  if (loadError) return fail(mapDbError(loadError));
  if (!testRun) return fail('Test run not found.');

  if (!canTransitionTestRunStatus(testRun.status, 'cancelled')) {
    return fail(`This run can no longer be cancelled (its status is "${testRun.status}").`);
  }

  try {
    await removeQueuedTestRunJob(testRun.id);
  } catch (queueError) {
    // Best-effort — the database status change below is what actually
    // matters; a Redis hiccup here shouldn't block cancellation.
    // eslint-disable-next-line no-console
    console.error('Failed to remove queued test run job', testRun.id, queueError);
  }

  const { error: updateError } = await supabase
    .from('test_runs')
    .update({ status: 'cancelled', finished_at: new Date().toISOString() })
    .eq('id', testRun.id)
    .eq('organization_id', organization.organizationId);

  if (updateError) return fail(mapDbError(updateError));

  await supabase.rpc('log_audit_event', {
    p_organization_id: organization.organizationId,
    p_action: 'test_run_cancelled',
    p_target_type: 'test_run',
    p_target_id: testRun.id,
    p_metadata: {},
  });

  return ok(undefined);
}
