import { SearchInput } from '@qavio/ui';

import { MobileNav } from '../navigation/mobile-nav';
import { UserMenu } from '../navigation/user-menu';
import { NotificationsMenu } from './notifications-menu';

export function AppHeader() {
  return (
    <header className="flex h-14 items-center gap-3 border-b px-4 sm:px-6">
      <MobileNav />
      <div className="max-w-md flex-1">
        <SearchInput placeholder="Search anything…" aria-label="Search" />
      </div>
      <div className="flex items-center gap-2">
        <NotificationsMenu />
        <UserMenu user={null} />
      </div>
    </header>
  );
}
