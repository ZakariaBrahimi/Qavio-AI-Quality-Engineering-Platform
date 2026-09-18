import type { OrganizationRole } from '@qavio/types';
import { SearchInput } from '@qavio/ui';

import type { OrganizationMembership } from '@/lib/organizations';

import { MobileNav } from '../navigation/mobile-nav';
import { UserMenu } from '../navigation/user-menu';
import { NotificationsMenu } from './notifications-menu';

export interface AppHeaderProps {
  user: { name: string; email: string } | null;
  role?: OrganizationRole;
  organizations: OrganizationMembership[];
  currentOrganizationId: string | null;
}

export function AppHeader({ user, role, organizations, currentOrganizationId }: AppHeaderProps) {
  return (
    <header className="flex h-14 items-center gap-3 border-b px-4 sm:px-6">
      <MobileNav organizations={organizations} currentOrganizationId={currentOrganizationId} />
      <div className="max-w-md flex-1">
        <SearchInput placeholder="Search anything…" aria-label="Search" />
      </div>
      <div className="flex items-center gap-2">
        <NotificationsMenu />
        <UserMenu user={user} role={role} />
      </div>
    </header>
  );
}
