'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@qavio/ui';
import { Bell } from 'lucide-react';

export interface NotificationsMenuProps {
  count?: number;
}

/** Shows a real empty state — there is no notification backend yet. */
export function NotificationsMenu({ count = 0 }: NotificationsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={count > 0 ? `${count} unread notifications` : 'Notifications'}
          className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent"
        >
          <Bell className="h-5 w-5" />
          {count > 0 ? (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
          ) : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">
          You&apos;re all caught up — no notifications yet.
        </p>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
