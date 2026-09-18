'use client';

import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@qavio/ui';

export interface UserMenuProps {
  /** `null` when no one is signed in — renders a Sign in link instead. */
  user: { name: string; email: string; role: string } | null;
}

export function UserMenu({ user }: UserMenuProps) {
  if (!user) {
    return (
      <Button asChild size="sm" variant="outline">
        <Link href="/login">Sign in</Link>
      </Button>
    );
  }

  const initials = user.name
    .split(' ')
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-md py-1 pl-1 pr-2 text-left hover:bg-accent"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {initials}
          </span>
          <span className="hidden text-sm sm:block">
            <span className="block font-medium leading-tight">{user.name}</span>
            <span className="block text-xs leading-tight text-muted-foreground">{user.role}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <UserIcon className="h-4 w-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/login" className="flex items-center gap-2">
            <LogOut className="h-4 w-4" />
            Sign out
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
