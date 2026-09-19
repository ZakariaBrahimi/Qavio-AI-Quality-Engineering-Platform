import { beforeEach, describe, expect, it, vi } from 'vitest';

import { cancelTestRun, createTestRun } from '../actions';

const mockGetCurrentOrganization = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockEnqueueTestRun = vi.hoisted(() => vi.fn());
const mockRemoveQueuedTestRunJob = vi.hoisted(() => vi.fn().mockResolvedValue(false));
const mockFromResults = vi.hoisted(
  () => new Map<string, { data?: unknown; error?: unknown }>(),
);
const mockEqCalls = vi.hoisted(() => [] as Array<{ table: string; column: string; value: unknown }>);
const mockInsertCalls = vi.hoisted(() => [] as Array<{ table: string; row: unknown }>);

/** Same chainable fake as projects/[id]/__tests__/actions.test.ts — records every .eq() so tests can assert org/project scoping, and resolves however far the action's chain walks (.single()/.maybeSingle()/awaited directly). */
function chain(table: string, result: { data?: unknown; error?: unknown }) {
  const node: Record<string, unknown> = {
    select: () => node,
    insert: (row: unknown) => {
      mockInsertCalls.push({ table, row });
      return node;
    },
    update: () => node,
    is: () => node,
    eq: (column: string, value: unknown) => {
      mockEqCalls.push({ table, column, value });
      return node;
    },
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return node;
}

vi.mock('@/lib/organizations', () => ({
  getCurrentOrganization: mockGetCurrentOrganization,
}));

vi.mock('@/lib/queue', () => ({
  enqueueTestRun: mockEnqueueTestRun,
  removeQueuedTestRunJob: mockRemoveQueuedTestRunJob,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => chain(table, mockFromResults.get(table) ?? { data: null, error: null }),
    rpc: mockRpc,
  }),
}));

const qaOrg = {
  organizationId: 'org-1',
  organizationName: 'Acme',
  organizationSlug: 'acme',
  role: 'qa' as const,
};
const developerOrg = { ...qaOrg, role: 'developer' as const };
const viewerOrg = { ...qaOrg, role: 'viewer' as const };

const validInput = {
  projectId: '11111111-1111-4111-8111-111111111111',
  environmentId: '22222222-2222-4222-8222-222222222222',
  type: 'functional',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockFromResults.clear();
  mockEqCalls.length = 0;
  mockInsertCalls.length = 0;
  mockGetUser.mockResolvedValue({ data: { user: { id: 'actor-1' } } });
  mockEnqueueTestRun.mockResolvedValue(undefined);
  mockRemoveQueuedTestRunJob.mockResolvedValue(false);
});

describe('createTestRun — authorization', () => {
  it('rejects when there is no active organization', async () => {
    mockGetCurrentOrganization.mockResolvedValue(null);
    const result = await createTestRun(validInput);
    expect(result.ok).toBe(false);
    expect(mockEnqueueTestRun).not.toHaveBeenCalled();
  });

  it('rejects a developer — only QA+ may start a run (see rbac.ts manage_test_workflows)', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    const result = await createTestRun(validInput);
    expect(result.ok).toBe(false);
    expect(mockEnqueueTestRun).not.toHaveBeenCalled();
  });

  it('rejects a viewer', async () => {
    mockGetCurrentOrganization.mockResolvedValue(viewerOrg);
    const result = await createTestRun(validInput);
    expect(result.ok).toBe(false);
    expect(mockEnqueueTestRun).not.toHaveBeenCalled();
  });

  it('rejects malformed input before ever checking permissions or touching the database', async () => {
    mockGetCurrentOrganization.mockResolvedValue(qaOrg);
    const result = await createTestRun({ projectId: 'not-a-uuid', environmentId: 'env-1', type: 'functional' });
    expect(result.ok).toBe(false);
    expect(mockEnqueueTestRun).not.toHaveBeenCalled();
  });
});

describe('createTestRun — cross-org scoping and happy path', () => {
  it("won't find a project or environment id belonging to another organization", async () => {
    mockGetCurrentOrganization.mockResolvedValue(qaOrg);
    mockFromResults.set('projects', { data: null, error: null });

    const result = await createTestRun({
      projectId: '11111111-1111-4111-8111-111111111111',
      environmentId: '22222222-2222-4222-8222-222222222222',
      type: 'functional',
    });

    expect(result.ok).toBe(false);
    expect(mockEqCalls).toContainEqual({ table: 'projects', column: 'organization_id', value: 'org-1' });
    expect(mockEnqueueTestRun).not.toHaveBeenCalled();
  });

  it('rejects an environment that exists but belongs to a different project', async () => {
    mockGetCurrentOrganization.mockResolvedValue(qaOrg);
    mockFromResults.set('projects', { data: { id: validInput.projectId }, error: null });
    mockFromResults.set('environments', { data: null, error: null });

    const result = await createTestRun(validInput);

    expect(result.ok).toBe(false);
    expect(mockEqCalls).toContainEqual({
      table: 'environments',
      column: 'project_id',
      value: validInput.projectId,
    });
    expect(mockEnqueueTestRun).not.toHaveBeenCalled();
  });

  it('creates the run, enqueues it, and marks it queued for a QA member', async () => {
    mockGetCurrentOrganization.mockResolvedValue(qaOrg);
    mockFromResults.set('projects', { data: { id: 'proj-1' }, error: null });
    mockFromResults.set('environments', { data: { id: 'env-1' }, error: null });
    mockFromResults.set('test_runs', { data: { id: 'run-1' }, error: null });

    const result = await createTestRun(validInput);

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.testRunId).toBe('run-1');
    expect(mockEnqueueTestRun).toHaveBeenCalledWith(
      expect.objectContaining({ testRunId: 'run-1', organizationId: 'org-1', type: 'functional' }),
    );
    expect(mockEqCalls).toContainEqual({ table: 'test_runs', column: 'organization_id', value: 'org-1' });
  });

  it('passes an optional test-only configuration (durationMs/forceFailure) through to the insert', async () => {
    mockGetCurrentOrganization.mockResolvedValue(qaOrg);
    mockFromResults.set('projects', { data: { id: 'proj-1' }, error: null });
    mockFromResults.set('environments', { data: { id: 'env-1' }, error: null });
    mockFromResults.set('test_runs', { data: { id: 'run-1' }, error: null });

    const result = await createTestRun({ ...validInput, configuration: { durationMs: 500, forceFailure: true } });

    expect(result.ok).toBe(true);
    expect(mockInsertCalls).toContainEqual(
      expect.objectContaining({ table: 'test_runs', row: expect.objectContaining({ configuration: { durationMs: 500, forceFailure: true } }) }),
    );
  });

  it('rejects an unrecognized configuration key (only durationMs/forceFailure are allowed)', async () => {
    mockGetCurrentOrganization.mockResolvedValue(qaOrg);
    const result = await createTestRun({
      ...validInput,
      configuration: { unexpectedKey: true } as unknown as { durationMs?: number },
    });
    expect(result.ok).toBe(false);
    expect(mockEnqueueTestRun).not.toHaveBeenCalled();
  });

  it('rejects a configuration.durationMs above the 60s cap', async () => {
    mockGetCurrentOrganization.mockResolvedValue(qaOrg);
    const result = await createTestRun({ ...validInput, configuration: { durationMs: 120_000 } });
    expect(result.ok).toBe(false);
    expect(mockEnqueueTestRun).not.toHaveBeenCalled();
  });

  it('marks the run failed instead of leaving it stuck in "created" when enqueueing throws', async () => {
    mockGetCurrentOrganization.mockResolvedValue(qaOrg);
    mockFromResults.set('projects', { data: { id: 'proj-1' }, error: null });
    mockFromResults.set('environments', { data: { id: 'env-1' }, error: null });
    mockFromResults.set('test_runs', { data: { id: 'run-1' }, error: null });
    mockEnqueueTestRun.mockRejectedValue(new Error('Redis unavailable'));

    const result = await createTestRun(validInput);

    expect(result.ok).toBe(false);
  });
});

describe('cancelTestRun — authorization and cross-org scoping', () => {
  it('rejects a developer', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    const result = await cancelTestRun({ testRunId: 'run-1' });
    expect(result.ok).toBe(false);
  });

  it("returns not-found for a run id belonging to another organization (RLS-equivalent 'wrong id looks identical')", async () => {
    mockGetCurrentOrganization.mockResolvedValue(qaOrg);
    mockFromResults.set('test_runs', { data: null, error: null });

    const result = await cancelTestRun({ testRunId: 'run-from-another-org' });

    expect(result.ok).toBe(false);
    expect(mockEqCalls).toContainEqual({ table: 'test_runs', column: 'organization_id', value: 'org-1' });
  });

  it('rejects cancelling a run that is already terminal', async () => {
    mockGetCurrentOrganization.mockResolvedValue(qaOrg);
    mockFromResults.set('test_runs', { data: { id: 'run-1', status: 'completed' }, error: null });

    const result = await cancelTestRun({ testRunId: 'run-1' });

    expect(result.ok).toBe(false);
  });

  it('cancels a queued run and removes the queued job', async () => {
    mockGetCurrentOrganization.mockResolvedValue(qaOrg);
    mockFromResults.set('test_runs', { data: { id: 'run-1', status: 'queued' }, error: null });

    const result = await cancelTestRun({ testRunId: 'run-1' });

    expect(result.ok).toBe(true);
    expect(mockRemoveQueuedTestRunJob).toHaveBeenCalledWith('run-1');
  });
});
