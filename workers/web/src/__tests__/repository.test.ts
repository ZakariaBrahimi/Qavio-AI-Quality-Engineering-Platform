import { describe, expect, it, vi } from 'vitest';

import {
  loadExecutionTarget,
  transitionTestRun,
  updateProgress,
  upsertJobRecord,
  writeArtifacts,
  writeTestResults,
} from '../repository';
import type { AdminClient, TestRunRow } from '../repository';

/** A minimal thenable query-builder stand-in — every chain method returns itself, and awaiting it resolves to `result`. Good enough for repository.ts, which never reads anything off the builder beyond the final `{ data, error }`. */
function chainable(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  for (const method of ['select', 'eq', 'is', 'delete', 'update', 'upsert', 'insert']) {
    builder[method] = vi.fn(self);
  }
  builder.maybeSingle = vi.fn(() => Promise.resolve(result));
  builder.single = vi.fn(() => Promise.resolve(result));
  // eq()/delete()/insert()/upsert() chains that are awaited directly (no .single()/.maybeSingle()) — mirrors supabase-js's thenable query builders.
  (builder as { then: PromiseLike<unknown>['then'] }).then = (onFulfilled) =>
    Promise.resolve(result).then(onFulfilled as never);
  return builder;
}

function testRunRow(overrides: Partial<TestRunRow> = {}): TestRunRow {
  return {
    id: 'run-1',
    organization_id: 'org-1',
    project_id: 'project-1',
    environment_id: 'env-1',
    test_suite_id: null,
    type: 'functional',
    status: 'running',
    configuration: {},
    error_message: null,
    triggered_by: null,
    started_at: null,
    finished_at: null,
    created_at: new Date().toISOString(),
    ...overrides,
  } as TestRunRow;
}

describe('writeTestResults', () => {
  it('deletes existing results before inserting the fresh set, scoped to the run', async () => {
    const deleteBuilder = chainable({ error: null });
    const insertBuilder = chainable({ error: null });
    const from = vi.fn().mockReturnValueOnce(deleteBuilder).mockReturnValueOnce(insertBuilder);
    const admin = { from } as unknown as AdminClient;

    await writeTestResults(admin, 'org-1', 'run-1', [
      { id: 'result-1', name: 'Basic page load', status: 'passed', durationMs: 100 },
    ]);

    expect(from).toHaveBeenNthCalledWith(1, 'test_results');
    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(deleteBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(deleteBuilder.eq).toHaveBeenCalledWith('test_run_id', 'run-1');

    expect(from).toHaveBeenNthCalledWith(2, 'test_results');
    expect(insertBuilder.insert).toHaveBeenCalledWith([
      expect.objectContaining({ organization_id: 'org-1', test_run_id: 'run-1', name: 'Basic page load' }),
    ]);
  });

  it('still clears old results even when the fresh set is empty, without inserting anything', async () => {
    const deleteBuilder = chainable({ error: null });
    const from = vi.fn().mockReturnValue(deleteBuilder);
    const admin = { from } as unknown as AdminClient;

    await writeTestResults(admin, 'org-1', 'run-1', []);

    expect(deleteBuilder.delete).toHaveBeenCalled();
    expect(from).toHaveBeenCalledTimes(1);
  });
});

describe('upsertJobRecord', () => {
  it('upserts on job_id so a retry updates the same row instead of inserting a new one', async () => {
    const builder = chainable({ error: null });
    const from = vi.fn().mockReturnValue(builder);
    const admin = { from } as unknown as AdminClient;

    await upsertJobRecord(admin, {
      organizationId: 'org-1',
      testRunId: 'run-1',
      jobId: 'run-1',
      status: 'active',
      attempts: 2,
    });

    expect(from).toHaveBeenCalledWith('test_run_jobs');
    expect(builder.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ job_id: 'run-1', test_run_id: 'run-1', attempts: 2, status: 'active' }),
      { onConflict: 'job_id' },
    );
  });
});

describe('transitionTestRun', () => {
  it('rejects an illegal transition without ever touching the database', async () => {
    const from = vi.fn();
    const admin = { from } as unknown as AdminClient;
    const run = testRunRow({ status: 'completed' });

    await expect(transitionTestRun(admin, run, 'running')).rejects.toThrow();
    expect(from).not.toHaveBeenCalled();
  });

  it('writes the new status for a legal transition', async () => {
    const updated = testRunRow({ status: 'completed', finished_at: new Date().toISOString() });
    const builder = chainable({ data: updated, error: null });
    const from = vi.fn().mockReturnValue(builder);
    const admin = { from } as unknown as AdminClient;
    const run = testRunRow({ status: 'running' });

    const result = await transitionTestRun(admin, run, 'completed', { finishedAt: updated.finished_at });

    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'completed' }));
    expect(result).toEqual(updated);
  });

  it('includes summary in the write when provided', async () => {
    const updated = testRunRow({ status: 'completed' });
    const builder = chainable({ data: updated, error: null });
    const from = vi.fn().mockReturnValue(builder);
    const admin = { from } as unknown as AdminClient;
    const run = testRunRow({ status: 'running' });
    const summary = { totalChecks: 3, passed: 3, failed: 0, pagesVisited: 3 };

    await transitionTestRun(admin, run, 'completed', { summary });

    expect(builder.update).toHaveBeenCalledWith(expect.objectContaining({ summary }));
  });
});

describe('loadExecutionTarget', () => {
  it('returns null when the project or environment does not exist (e.g. cross-org, archived, or a real not-found)', async () => {
    const projectBuilder = chainable({ data: null, error: null });
    const environmentBuilder = chainable({ data: { base_url: 'https://example.com' }, error: null });
    const from = vi.fn((table: string) => (table === 'projects' ? projectBuilder : environmentBuilder));
    const admin = { from } as unknown as AdminClient;

    const target = await loadExecutionTarget(admin, 'org-1', 'proj-1', 'env-1');

    expect(target).toBeNull();
  });

  it('returns the base URL and project platform when both exist and belong to the org', async () => {
    const projectBuilder = chainable({ data: { platform: 'web' }, error: null });
    const environmentBuilder = chainable({ data: { base_url: 'https://staging.example.com' }, error: null });
    const from = vi.fn((table: string) => (table === 'projects' ? projectBuilder : environmentBuilder));
    const admin = { from } as unknown as AdminClient;

    const target = await loadExecutionTarget(admin, 'org-1', 'proj-1', 'env-1');

    expect(target).toEqual({ baseUrl: 'https://staging.example.com', projectPlatform: 'web' });
    expect(projectBuilder.eq).toHaveBeenCalledWith('organization_id', 'org-1');
    expect(environmentBuilder.eq).toHaveBeenCalledWith('project_id', 'proj-1');
  });
});

describe('updateProgress', () => {
  it('writes a plain progress string scoped to the run and organization', async () => {
    const builder = chainable({ error: null });
    const from = vi.fn().mockReturnValue(builder);
    const admin = { from } as unknown as AdminClient;

    await updateProgress(admin, 'org-1', 'run-1', 'Discovering pages');

    expect(from).toHaveBeenCalledWith('test_runs');
    expect(builder.update).toHaveBeenCalledWith({ progress: 'Discovering pages' });
    expect(builder.eq).toHaveBeenCalledWith('id', 'run-1');
    expect(builder.eq).toHaveBeenCalledWith('organization_id', 'org-1');
  });
});

describe('writeArtifacts', () => {
  function storageMock(uploadError: { message: string } | null = null) {
    const upload = vi.fn().mockResolvedValue({ error: uploadError });
    return { from: vi.fn(() => ({ upload })), upload };
  }

  it('does nothing when there are no artifacts', async () => {
    const storage = storageMock();
    const from = vi.fn();
    const admin = { from, storage } as unknown as AdminClient;

    await writeArtifacts(admin, 'org-1', 'proj-1', 'run-1', []);

    expect(storage.from).not.toHaveBeenCalled();
    expect(from).not.toHaveBeenCalled();
  });

  it('uploads to the documented storage path and records metadata referencing the result', async () => {
    const storage = storageMock();
    const insertBuilder = chainable({ error: null });
    const from = vi.fn().mockReturnValue(insertBuilder);
    const admin = { from, storage } as unknown as AdminClient;

    await writeArtifacts(admin, 'org-1', 'proj-1', 'run-1', [
      { resultId: 'result-1', kind: 'screenshot', filename: 'about.png', contentType: 'image/png', data: Buffer.from('x') },
    ]);

    expect(storage.from).toHaveBeenCalledWith('artifacts');
    expect(storage.upload).toHaveBeenCalledWith(
      'organizations/org-1/projects/proj-1/test-runs/run-1/about.png',
      expect.any(Buffer),
      expect.objectContaining({ contentType: 'image/png' }),
    );
    expect(insertBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        test_result_id: 'result-1',
        kind: 'screenshot',
        storage_path: 'organizations/org-1/projects/proj-1/test-runs/run-1/about.png',
      }),
    );
  });

  it('collects and throws all failures rather than silently dropping any', async () => {
    const storage = storageMock({ message: 'bucket unreachable' });
    const admin = { from: vi.fn(), storage } as unknown as AdminClient;

    await expect(
      writeArtifacts(admin, 'org-1', 'proj-1', 'run-1', [
        { resultId: 'result-1', kind: 'screenshot', filename: 'a.png', contentType: 'image/png', data: Buffer.from('x') },
        { resultId: 'result-2', kind: 'screenshot', filename: 'b.png', contentType: 'image/png', data: Buffer.from('y') },
      ]),
    ).rejects.toThrow(/2 of 2/);
  });
});
