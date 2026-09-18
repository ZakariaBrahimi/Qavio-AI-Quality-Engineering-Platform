import { Eye, Shield, User, Users } from 'lucide-react';
import type { Metadata } from 'next';

import { MetricCard } from '@qavio/ui';

import { TeamView } from '@/components/team/team-view';
import { getOrganizationMembers, getPendingInvitations } from '@/lib/members';
import { getCurrentOrganization } from '@/lib/organizations';
import { getCurrentUser } from '@/lib/session';

export const metadata: Metadata = { title: 'Team' };

export default async function TeamPage() {
  const [organization, user] = await Promise.all([getCurrentOrganization(), getCurrentUser()]);

  // The dashboard layout already redirects to /onboarding when there's no
  // organization, and to /login when there's no session — reaching this
  // component with either missing would mean that guard was bypassed.
  if (!organization || !user) {
    return null;
  }

  const [members, invitations] = await Promise.all([
    getOrganizationMembers(organization.organizationId),
    getPendingInvitations(organization.organizationId),
  ]);

  const adminCount = members.filter((m) => m.role === 'admin' || m.role === 'owner').length;
  const developerCount = members.filter((m) => m.role === 'developer' || m.role === 'qa').length;
  const viewerCount = members.filter((m) => m.role === 'viewer').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-muted-foreground">
          Manage team members, their roles, and permissions.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Members" value={members.length} icon={Users} />
        <MetricCard label="Owners & Admins" value={adminCount} icon={Shield} />
        <MetricCard label="QA & Developers" value={developerCount} icon={User} />
        <MetricCard label="Viewers" value={viewerCount} icon={Eye} />
      </div>

      <TeamView
        members={members}
        invitations={invitations}
        currentRole={organization.role}
        currentUserId={user.id}
      />
    </div>
  );
}
