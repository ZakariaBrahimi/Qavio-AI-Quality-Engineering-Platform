import type { Job } from 'bullmq';
import type { TestExecutionResult, TestExecutor } from '@qavio/queue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { processTestRunJob, type TestRunWorkerDeps } from '../worker';
import type { AdminClient, TestRunRow } from '../repository';

vi.mock('../repository', () => ({
  loadTestRun: vi.fn(),
  transitionTestRun: vi.fn(),
  writeTestResults: vi.fn(),
  upsertJobRecord: vi.fn(),
}));

import * as repository from '../repository';

const PAYLOAD = {
  testRunId: 'run-1',
  organizationId: 'org-1',
  projectId: 'project-1',
  environmentId: 'env-1',
  type: 'functional' as const,
};

function fakeJob(overrides: Partial<Pick<Job, 'id' | 'attemptsMade' | 'opts'>> = {}) {
  return {
    id: 'run-1',
    attemptsMade: 0,
    opts: { attempts: 3 },
    ...overrides,
  } as Pick<Job, 'id' | 'attemptsMade' | 'opts'>;
}

function testRunRow(overrides: Partial<TestRunRow> = {}): TestRunRow {
  return {
    id: 'run-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    environment_id: 'env-1',
    test_suite_id: null,
    type: 'functional',
    status: 'queued',
    configuration: {},
    error_message: null,
    triggered_by: null,
    started_at: null,
    finished_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  } as TestRunRow;
}

function deps(executor: TestExecutor): TestRunWorkerDeps {
  return { admin: {} as AdminClient, executor, timeoutMs: 5_000 };
}

function fakeExecutor(result: TestExecutionResult): TestExecutor {
  return { execute: vi.fn().mockResolvedValue(result) };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('processTestRunJob', () => {
  it('drops the job without throwing when the test run does not exist', async () => {
    vi.mocked(repository.loadTestRun).mockResolvedValue(null);
    const executor = fakeExecutor({ status: 'completed', results: [] });

    await expect(processTestRunJob(deps(executor), PAYLOAD, fakeJob())).resolves.toBeUndefined();

    expect(executor.execute).not.toHaveBeenCalled();
    expect(repository.upsertJobRecord).not.toHaveBeenCalled();
  });

  it('skips processing when the test run is already terminal (idempotent no-op)', async () => {
    vi.mocked(repository.loadTestRun).mockResolvedValue(testRunRow({ status: 'completed' }));
    const executor = fakeExecutor({ status: 'completed', results: [] });

    await processTestRunJob(deps(executor), PAYLOAD, fakeJob());

    expect(executor.execute).not.toHaveBeenCalled();
    expect(repository.transitionTestRun).not.toHaveBeenCalled();
  });

  it('drives a successful run through starting -> running -> completed and writes results', async () => {
    const queued = testRunRow({ status: 'queued' });
    const starting = testRunRow({ status: 'starting' });
    const running = testRunRow({ status: 'running', started_at: new Date().toISOString() });

    vi.mocked(repository.loadTestRun).mockResolvedValueOnce(queued).mockResolvedValueOnce(running);
    vi.mocked(repository.transitionTestRun).mockResolvedValueOnce(starting).mockResolvedValueOnce(running);

    const result: TestExecutionResult = {
      status: 'completed',
      results: [{ name: 'Basic page load', status: 'passed', durationMs: 120 }],
    };
    const executor = fakeExecutor(result);

    await processTestRunJob(deps(executor), PAYLOAD, fakeJob());

    expect(repository.transitionTestRun).toHaveBeenNthCalledWith(1, {}, queued, 'starting');
    expect(repository.transitionTestRun).toHaveBeenNthCalledWith(
      2,
      {},
      starting,
      'running',
      expect.objectContaining({ startedAt: expect.any(String) }),
    );
    expect(repository.writeTestResults).toHaveBeenCalledWith({}, 'org-1', 'run-1', result.results);
    expect(repository.transitionTestRun).toHaveBeenNthCalledWith(
      3,
      {},
      running,
      'completed',
      expect.objectContaining({ errorMessage: null }),
    );
    expect(repository.upsertJobRecord).toHaveBeenLastCalledWith(
      {},
      expect.objectContaining({ status: 'completed', jobId: 'run-1' }),
    );
  });

  it('marks the run failed on the final attempt when the executor throws', async () => {
    const running = testRunRow({ status: 'running', started_at: new Date().toISOString() });
    vi.mocked(repository.loadTestRun).mockResolvedValue(running);
    vi.mocked(repository.transitionTestRun).mockResolvedValue(running);

    const executor: TestExecutor = { execute: vi.fn().mockRejectedValue(new Error('boom')) };

    await expect(
      processTestRunJob(deps(executor), PAYLOAD, fakeJob({ attemptsMade: 2, opts: { attempts: 3 } })),
    ).rejects.toThrow('boom');

    expect(repository.transitionTestRun).toHaveBeenCalledWith(
      {},
      running,
      'failed',
      expect.objectContaining({ errorMessage: 'boom' }),
    );
    expect(repository.upsertJobRecord).toHaveBeenLastCalledWith(
      {},
      expect.objectContaining({ status: 'failed', lastError: 'boom', finishedAt: expect.any(String) }),
    );
  });

  it('leaves the run running (for BullMQ to retry) when a non-final attempt throws', async () => {
    const running = testRunRow({ status: 'running', started_at: new Date().toISOString() });
    vi.mocked(repository.loadTestRun).mockResolvedValue(running);

    const executor: TestExecutor = { execute: vi.fn().mockRejectedValue(new Error('transient')) };

    await expect(
      processTestRunJob(deps(executor), PAYLOAD, fakeJob({ attemptsMade: 0, opts: { attempts: 3 } })),
    ).rejects.toThrow('transient');

    expect(repository.transitionTestRun).not.toHaveBeenCalledWith({}, running, 'failed', expect.anything());
    expect(repository.upsertJobRecord).toHaveBeenLastCalledWith(
      {},
      expect.objectContaining({ status: 'failed', lastError: 'transient', finishedAt: null }),
    );
  });

  it('does not overwrite a run finalized concurrently (e.g. cancelled) while executing', async () => {
    const running = testRunRow({ status: 'running', started_at: new Date().toISOString() });
    const cancelled = testRunRow({ status: 'cancelled' });

    vi.mocked(repository.loadTestRun).mockResolvedValueOnce(running).mockResolvedValueOnce(cancelled);

    const executor = fakeExecutor({ status: 'completed', results: [] });

    await processTestRunJob(deps(executor), PAYLOAD, fakeJob());

    expect(repository.transitionTestRun).not.toHaveBeenCalledWith({}, cancelled, expect.anything(), expect.anything());
  });
});
