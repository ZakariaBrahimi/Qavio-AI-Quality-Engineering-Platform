import { beforeEach, describe, expect, it, vi } from 'vitest';

import { archiveProject, createProject, deleteProject, restoreProject, updateProject } from '../actions';

const mockGetCurrentOrganization = vi.hoisted(() => vi.fn());
const mockGetUser = vi.hoisted(() => vi.fn());
const mockRpc = vi.hoisted(() => vi.fn().mockResolvedValue({ data: null, error: null }));
const mockFromResults = vi.hoisted(
  () => new Map<string, { data?: unknown; error?: unknown; count?: number }>(),
);
const mockEqCalls = vi.hoisted(() => [] as Array<{ table: string; column: string; value: unknown }>);

/** A chainable fake matching however far each action walks the query builder, recording every .eq() so tests can assert org-scoping. */
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

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ data: null, error: null });
  mockFromResults.clear();
  mockEqCalls.length = 0;
  mockGetUser.mockResolvedValue({ data: { user: { id: 'actor-1' } } });
});

describe('createProject — unauthorized access', () => {
  it('rejects a developer, who cannot manage projects', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    const result = await createProject({ name: 'New App', platform: 'web' });
    expect(result.ok).toBe(false);
  });

  it('rejects a viewer', async () => {
    mockGetCurrentOrganization.mockResolvedValue(viewerOrg);
    const result = await createProject({ name: 'New App', platform: 'web' });
    expect(result.ok).toBe(false);
  });

  it('rejects when there is no active organization', async () => {
    mockGetCurrentOrganization.mockResolvedValue(null);
    const result = await createProject({ name: 'New App', platform: 'web' });
    expect(result.ok).toBe(false);
  });

  it('rejects an unavailable platform even for an owner', async () => {
    mockGetCurrentOrganization.mockResolvedValue(ownerOrg);
    const result = await createProject({ name: 'New App', platform: 'mobile' });
    expect(result.ok).toBe(false);
  });
});

describe('createProject — happy path', () => {
  it('lets an admin create a web project scoped to their organization', async () => {
    mockGetCurrentOrganization.mockResolvedValue(adminOrg);
    mockFromResults.set('projects', { data: { id: 'proj-1' }, error: null });

    const result = await createProject({ name: 'New App', description: 'desc', platform: 'web' });

    expect(result.ok).toBe(true);
  });
});

describe('updateProject / archiveProject / restoreProject — permissions and cross-org scoping', () => {
  it('rejects a developer updating a project', async () => {
    mockGetCurrentOrganization.mockResolvedValue(developerOrg);
    const result = await updateProject({ projectId: 'proj-1', name: 'Renamed', platform: 'web' });
    expect(result.ok).toBe(false);
  });

  it('scopes the update query by id AND the caller organization_id, never trusting the id alone', async () => {
    mockGetCurrentOrganization.mockResolvedValue(adminOrg);
    mockFromResults.set('projects', { data: null, error: null });

    await updateProject({ projectId: 'proj-from-another-org', name: 'Renamed', platform: 'web' });

    expect(mockEqCalls).toContainEqual({ table: 'projects', column: 'id', value: 'proj-from-another-org' });
    expect(mockEqCalls).toContainEqual({ table: 'projects', column: 'organization_id', value: 'org-1' });
  });

  it('rejects a viewer archiving a project', async () => {
    mockGetCurrentOrganization.mockResolvedValue(viewerOrg);
    const result = await archiveProject({ projectId: 'proj-1' });
    expect(result.ok).toBe(false);
  });

  it('scopes archive by the caller organization_id', async () => {
    mockGetCurrentOrganization.mockResolvedValue(adminOrg);
    mockFromResults.set('projects', { data: null, error: null });

    await archiveProject({ projectId: 'proj-x' });

    expect(mockEqCalls).toContainEqual({ table: 'projects', column: 'organization_id', value: 'org-1' });
  });

  it('scopes restore by the caller organization_id', async () => {
    mockGetCurrentOrganization.mockResolvedValue(adminOrg);
    mockFromResults.set('projects', { data: null, error: null });

    await restoreProject({ projectId: 'proj-x' });

    expect(mockEqCalls).toContainEqual({ table: 'projects', column: 'organization_id', value: 'org-1' });
  });
});

describe('deleteProject — owner-only hard delete, cross-org scoping', () => {
  it('rejects an admin, since hard delete is owner-only', async () => {
    mockGetCurrentOrganization.mockResolvedValue(adminOrg);
    const result = await deleteProject({ projectId: 'proj-1' });
    expect(result.ok).toBe(false);
  });

  it('rejects when there is no active organization', async () => {
    mockGetCurrentOrganization.mockResolvedValue(null);
    const result = await deleteProject({ projectId: 'proj-1' });
    expect(result.ok).toBe(false);
  });

  it('lets an owner delete, scoped to their own organization_id — an id from another org would match zero rows', async () => {
    mockGetCurrentOrganization.mockResolvedValue(ownerOrg);
    mockFromResults.set('projects', { data: null, error: null });

    const result = await deleteProject({ projectId: 'proj-from-another-org' });

    expect(result.ok).toBe(true);
    expect(mockEqCalls).toContainEqual({ table: 'projects', column: 'id', value: 'proj-from-another-org' });
    expect(mockEqCalls).toContainEqual({ table: 'projects', column: 'organization_id', value: 'org-1' });
  });
});
