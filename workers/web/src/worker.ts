import type { Job, Worker } from 'bullmq';
import {
  createTestRunWorker as createQueueWorker,
  type TestExecutionResult,
  type TestExecutor,
  type TestRunJobPayload,
} from '@qavio/queue';
import { isTestRunFinished, type TestRunStatus } from '@qavio/types';

import { logger, type LogContext } from './logger';
import * as repository from './repository';
import type { AdminClient, TestRunRow } from './repository';

export interface TestRunWorkerDeps {
  admin: AdminClient;
  executor: TestExecutor;
  timeoutMs: number;
}

export interface TestRunWorkerOptions {
  redisUrl: string;
  concurrency: number;
  admin: AdminClient;
  timeoutMs: number;
  executor: TestExecutor;
}

/**
 * Races the executor against `timeoutMs`, aborting its signal *and*
 * rejecting the race so a badly-behaved executor that never checks
 * `signal.aborted` still can't run forever — "a test must not be allowed
 * to run forever" holds even for an executor that ignores cancellation.
 */
async function executeWithTimeout(
  executor: TestExecutor,
  payload: TestRunJobPayload,
  timeoutMs: number,
): Promise<TestExecutionResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await new Promise<TestExecutionResult>((resolve, reject) => {
      controller.signal.addEventListener('abort', () => {
        reject(new Error(`Test run timed out after ${timeoutMs}ms`));
      });

      executor
        .execute({
          testRunId: payload.testRunId,
          organizationId: payload.organizationId,
          projectId: payload.projectId,
          environmentId: payload.environmentId,
          type: payload.type,
          signal: controller.signal,
        })
        .then(resolve, reject);
    });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Drives one Test Run through STARTING -> RUNNING -> a terminal status.
 * Exported separately from `createTestRunWorker` so tests can call it
 * directly with fakes for `deps` and `job`, without a real Redis
 * connection.
 */
export async function processTestRunJob(
  deps: TestRunWorkerDeps,
  payload: TestRunJobPayload,
  job: Pick<Job<TestRunJobPayload>, 'id' | 'attemptsMade' | 'opts'>,
): Promise<void> {
  const { admin, executor, timeoutMs } = deps;
  const jobId = job.id ?? payload.testRunId;
  const context: LogContext = {
    testRunId: payload.testRunId,
    projectId: payload.projectId,
    organizationId: payload.organizationId,
    jobId,
  };

  const attemptNumber = job.attemptsMade + 1;
  const maxAttempts = job.opts.attempts ?? 1;
  const isFinalAttempt = attemptNumber >= maxAttempts;

  logger.info('Test run job received', context, { attempt: attemptNumber, maxAttempts });

  const run = await repository.loadTestRun(admin, payload.organizationId, payload.testRunId);
  if (!run) {
    logger.error('Test run not found for job payload — dropping job, will not retry', context);
    return;
  }

  if (run.project_id !== payload.projectId || run.environment_id !== payload.environmentId) {
    logger.error('Job payload does not match the stored test run — dropping job, will not retry', context);
    return;
  }

  if (isTestRunFinished(run.status)) {
    logger.info('Test run already finished — skipping as an idempotent no-op', context, { status: run.status });
    return;
  }

  await repository.upsertJobRecord(admin, {
    organizationId: payload.organizationId,
    testRunId: payload.testRunId,
    jobId,
    status: 'active',
    attempts: attemptNumber,
  });

  try {
    const started = await advanceToRunning(admin, run);
    const result = await executeWithTimeout(executor, payload, timeoutMs);
    await repository.writeTestResults(admin, payload.organizationId, payload.testRunId, result.results);

    const latest = await repository.loadTestRun(admin, payload.organizationId, payload.testRunId);
    if (!latest || isTestRunFinished(latest.status)) {
      // A concurrent action (e.g. cancellation) already finalized this run —
      // the database stays the source of truth, so this attempt's own
      // result is discarded rather than clobbering it.
      logger.info('Test run was already finalized concurrently — not overwriting', context, {
        status: latest?.status ?? 'unknown',
      });
      await repository.upsertJobRecord(admin, {
        organizationId: payload.organizationId,
        testRunId: payload.testRunId,
        jobId,
        status: 'completed',
        attempts: attemptNumber,
        finishedAt: new Date().toISOString(),
      });
      return;
    }

    const finalStatus: TestRunStatus = result.status === 'completed' ? 'completed' : 'failed';
    await repository.transitionTestRun(admin, latest, finalStatus, {
      finishedAt: new Date().toISOString(),
      errorMessage: finalStatus === 'failed' ? (result.errorMessage ?? 'Test run failed.') : null,
    });

    await repository.upsertJobRecord(admin, {
      organizationId: payload.organizationId,
      testRunId: payload.testRunId,
      jobId,
      status: 'completed',
      attempts: attemptNumber,
      finishedAt: new Date().toISOString(),
    });

    logger.info('Test run job finished', context, { status: finalStatus, startedAt: started.started_at });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown worker error';
    logger.error('Test run job threw', context, { error: message, attempt: attemptNumber, isFinalAttempt });

    await repository.upsertJobRecord(admin, {
      organizationId: payload.organizationId,
      testRunId: payload.testRunId,
      jobId,
      status: 'failed',
      attempts: attemptNumber,
      lastError: message,
      finishedAt: isFinalAttempt ? new Date().toISOString() : null,
    });

    if (isFinalAttempt) {
      const latest = await repository.loadTestRun(admin, payload.organizationId, payload.testRunId);
      if (latest && !isTestRunFinished(latest.status)) {
        await repository.transitionTestRun(admin, latest, 'failed', {
          finishedAt: new Date().toISOString(),
          errorMessage: message,
        });
      }
    }

    // Rethrow so BullMQ's own bookkeeping (attemptsMade, the failed event,
    // scheduling the next retry) stays in sync with what we just did —
    // on the final attempt this only marks the job failed in Redis, since
    // the database side is already terminal by the time BullMQ sees it.
    throw error;
  }
}

/** queued -> starting -> running, tolerating a job that's retrying an already-running attempt (skips both transitions rather than re-asserting an illegal running -> running). */
async function advanceToRunning(admin: AdminClient, run: TestRunRow): Promise<TestRunRow> {
  let current = run;
  if (current.status === 'queued') {
    current = await repository.transitionTestRun(admin, current, 'starting');
  }
  if (current.status === 'starting') {
    current = await repository.transitionTestRun(admin, current, 'running', {
      startedAt: current.started_at ?? new Date().toISOString(),
    });
  }
  return current;
}

export function createTestRunWorker(options: TestRunWorkerOptions): Worker<TestRunJobPayload> {
  const deps: TestRunWorkerDeps = { admin: options.admin, executor: options.executor, timeoutMs: options.timeoutMs };

  return createQueueWorker({ redisUrl: options.redisUrl, concurrency: options.concurrency }, (payload, job) =>
    processTestRunJob(deps, payload, job),
  );
}
