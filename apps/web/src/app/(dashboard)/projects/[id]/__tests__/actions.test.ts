import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  archiveEnvironment,
  createEnvironment,
  deleteEnvironment,
  restoreEnvironment,
  setDefaultEnvironment,
  updateEnvironment,
} from '../actions';

const mockGetCurrentOrganization = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockFromResults = vi.hoisted(
  () => new Map<string, { data?: unknown; error?: unknown; count?: number }>(),
);
const mockEqCalls = vi.hoisted(() => [] as Array<{ table: string; column: string; value: unknown }>);

/** A chainable fake matching however far each action walks the query builder, recording every .eq() so tests can assert org/project-scoping. */
function chain(table: string, result: { data?: unknown; error?: unknown; count?: number }) {
  const node: Record<string, unknown> = {
    select: () => node,
    insert: () => node,
    update: () => node,
    delete: () => node,
    eq: (column: string, value: unknown) => {
      mockEqCalls.push({ table, column, value });
      return node;
    },
    single: () => Promise.resolve(result),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) =>
      Promise.resolve(result).then(resolve, reject),
  };
  return node;
}

vi.mock('@/lib/organizations', () => ({
  getCurrentOrganization: mockGetCurrentOrganization,
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => chain(table, mockFromResults.get(table) ?? { data: null, error: null }),
    rpc: mockRpc,
  }),
}));

const ownerOrg = {
  organizationId: 'org-1',
  organizationName: 'Acme',
  organizationSlug: 'acme',
  role: 'owner' as const,
};
const adminOrg = { ...ownerOrg, role: 'admin' as const };
const developerOrg = { ...ownerOrg, role: 'developer' as const };
const viewerOrg = { ...ownerOrg, role: 'viewer' as const };

const validEnvironmentInput = {
  projectId: 'proj-1',
  name: 'Staging',
  kind: 'staging',
  baseUrl: 'https://staging.example.com',
  configuration: '{"timeout": 30}',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockFromResults.clear();
  mockEqCalls.length = 0;
  mockGetUser.mockResolvedValue({ data: { user: { id: 'actor-1' } } });
});

describe('createEnvironment — unauthorized access and validation', () => {
  it('rejects a viewer, who cannot manage environments', async () => {
    mockGetCurrentOrganization.mockResolvedValue(viewerOrg);
    const result = await createEnvironment(validEnvironmentInput);
    expect(result.ok).toBe(false);
  });

  it('rejects when there is no active organization', async () => {
    mockGetCurrentOrganization.mockResolvedValue(null);
    const result = await createEnvironment(validEnvironmentInput);
    expect(result.ok).toBe(false);
  });

  it('rejects a non-http(s) base URL', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    const result = await createEnvironment({ ...validEnvironmentInput, baseUrl: 'ftp://example.com' });
    expect(result.ok).toBe(false);
  });

  it('rejects malformed JSON configuration', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    const result = await createEnvironment({ ...validEnvironmentInput, configuration: '{not json' });
    expect(result.ok).toBe(false);
  });

  it('rejects a non-object JSON configuration, e.g. an array', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    const result = await createEnvironment({ ...validEnvironmentInput, configuration: '[1,2,3]' });
    expect(result.ok).toBe(false);
  });
});

describe('createEnvironment — happy path', () => {
  it('lets a developer create an environment scoped to their organization', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    mockFromResults.set('environments', { data: { id: 'env-1' }, error: null, count: 0 });

    const result = await createEnvironment(validEnvironmentInput);

    expect(result.ok).toBe(true);
    expect(mockEqCalls).toContainEqual({ table: 'environments', column: 'organization_id', value: 'org-1' });
  });
});

describe('updateEnvironment / archiveEnvironment / restoreEnvironment — cross-org and cross-project scoping', () => {
  it('rejects a viewer updating an environment', async () => {
    mockGetCurrentOrganization.mockResolvedValue(viewerOrg);
    const result = await updateEnvironment({ environmentId: 'env-1', ...validEnvironmentInput });
    expect(result.ok).toBe(false);
  });

  it('scopes the update query by id, project_id, AND the caller organization_id', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    mockFromResults.set('environments', { data: null, error: null });

    await updateEnvironment({
      environmentId: 'env-from-another-org',
      ...validEnvironmentInput,
      projectId: 'proj-from-another-org',
    });

    expect(mockEqCalls).toContainEqual({ table: 'environments', column: 'id', value: 'env-from-another-org' });
    expect(mockEqCalls).toContainEqual({
      table: 'environments',
      column: 'project_id',
      value: 'proj-from-another-org',
    });
    expect(mockEqCalls).toContainEqual({ table: 'environments', column: 'organization_id', value: 'org-1' });
  });

  it('rejects a viewer archiving an environment', async () => {
    mockGetCurrentOrganization.mockResolvedValue(viewerOrg);
    const result = await archiveEnvironment({ environmentId: 'env-1', projectId: 'proj-1' });
    expect(result.ok).toBe(false);
  });

  it('scopes archive by the caller organization_id', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    mockFromResults.set('environments', { data: null, error: null });

    await archiveEnvironment({ environmentId: 'env-x', projectId: 'proj-1' });

    expect(mockEqCalls).toContainEqual({ table: 'environments', column: 'organization_id', value: 'org-1' });
  });

  it('scopes restore by the caller organization_id', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    mockFromResults.set('environments', { data: null, error: null });

    await restoreEnvironment({ environmentId: 'env-x', projectId: 'proj-1' });

    expect(mockEqCalls).toContainEqual({ table: 'environments', column: 'organization_id', value: 'org-1' });
  });
});

describe('deleteEnvironment — admin+ hard delete, cross-org scoping', () => {
  it('rejects a developer, since hard delete requires admin', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    const result = await deleteEnvironment({ environmentId: 'env-1', projectId: 'proj-1' });
    expect(result.ok).toBe(false);
  });

  it('rejects when there is no active organization', async () => {
    mockGetCurrentOrganization.mockResolvedValue(null);
    const result = await deleteEnvironment({ environmentId: 'env-1', projectId: 'proj-1' });
    expect(result.ok).toBe(false);
  });

  it('lets an admin delete, scoped to their own organization_id — an id from another org would match zero rows', async () => {
    mockGetCurrentOrganization.mockResolvedValue(adminOrg);
    mockFromResults.set('environments', { data: null, error: null });

    const result = await deleteEnvironment({ environmentId: 'env-from-another-org', projectId: 'proj-1' });

    expect(result.ok).toBe(true);
    expect(mockEqCalls).toContainEqual({
      table: 'environments',
      column: 'id',
      value: 'env-from-another-org',
    });
    expect(mockEqCalls).toContainEqual({ table: 'environments', column: 'organization_id', value: 'org-1' });
  });
});

describe('setDefaultEnvironment — permission gate before the RPC call', () => {
  it('rejects a viewer without ever calling the RPC', async () => {
    mockGetCurrentOrganization.mockResolvedValue(viewerOrg);
    const result = await setDefaultEnvironment({ environmentId: 'env-1' });
    expect(result.ok).toBe(false);
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it('lets a developer set the default via the SECURITY INVOKER RPC, which RLS still scopes to their org', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    const result = await setDefaultEnvironment({ environmentId: 'env-1' });
    expect(result.ok).toBe(true);
    expect(mockRpc).toHaveBeenCalledWith('set_default_environment', { p_environment_id: 'env-1' });
  });
});
