import { describe, expect, it, vi } from 'vitest';

import { transitionTestRun, upsertJobRecord, writeTestResults } from '../repository';
import type { AdminClient, TestRunRow } from '../repository';

/** A minimal thenable query-builder stand-in — every chain method returns itself, and awaiting it resolves to `result`. Good enough for repository.ts, which never reads anything off the builder beyond the final `{ data, error }`. */
function chainable(result: { data?: unknown; error?: unknown }) {
  const builder: Record<string, unknown> = {};
  const self = () => builder;
  for (const method of ['select', 'eq', 'delete', 'update', 'upsert', 'insert']) {
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
      { name: 'Basic page load', status: 'passed', durationMs: 100 },
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
});
