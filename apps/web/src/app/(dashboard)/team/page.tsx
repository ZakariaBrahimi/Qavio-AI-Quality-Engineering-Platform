import { Shield, User, Users, Eye } from 'lucide-react';
import type { Metadata } from 'next';

import { EmptyState, MetricCard } from '@qavio/ui';

import { InviteUserButton } from '@/components/team/invite-user-button';

export const metadata: Metadata = { title: 'Team' };

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground">
            Manage team members, their roles, and permissions.
          </p>
        </div>
        <InviteUserButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Users" value={0} icon={Users} />
        <MetricCard label="Admins" value={0} icon={Shield} />
        <MetricCard label="Developers" value={0} icon={User} />
        <MetricCard label="Viewers" value={0} icon={Eye} />
      </div>

      <EmptyState
        icon={Users}
        title="No team members yet"
        description="Invite teammates once organizations and authentication are wired up."
      />
    </div>
  );
}
