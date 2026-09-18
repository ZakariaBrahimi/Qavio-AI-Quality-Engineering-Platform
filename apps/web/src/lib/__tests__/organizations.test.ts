import { describe, expect, it } from 'vitest';

import { resolveCurrentOrganization, type OrganizationMembership } from '../organizations';

const orgA: OrganizationMembership = {
  organizationId: 'org-a',
  organizationName: 'Org A',
  organizationSlug: 'org-a',
  role: 'owner',
};
const orgB: OrganizationMembership = {
  organizationId: 'org-b',
  organizationName: 'Org B',
  organizationSlug: 'org-b',
  role: 'viewer',
};

describe('resolveCurrentOrganization', () => {
  it('returns null when the user has no memberships', () => {
    expect(resolveCurrentOrganization([], 'org-a')).toBeNull();
  });

  it('falls back to the first membership when no cookie is set', () => {
    expect(resolveCurrentOrganization([orgA, orgB], undefined)).toBe(orgA);
  });

  it('picks the organization matching the cookie', () => {
    expect(resolveCurrentOrganization([orgA, orgB], 'org-b')).toBe(orgB);
  });

  it('falls back to the first membership for a stale, forged, or foreign org id', () => {
    expect(resolveCurrentOrganization([orgA, orgB], 'someone-elses-org')).toBe(orgA);
  });
});
