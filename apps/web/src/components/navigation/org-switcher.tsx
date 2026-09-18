'use client';

import { ChevronsUpDown } from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@qavio/ui';

export interface OrganizationSwitcherProps {
  /** `null` when the signed-in user has no organization yet. */
  organization: { name: string; environment: string } | null;
}

/**
 * Sidebar-bottom workspace switcher. Shows the current organization and
 * active environment. Renders an honest "no organization yet" state
 * instead of a placeholder name — there is no fake org until one exists.
 */
export function OrganizationSwitcher({ organization }: OrganizationSwitcherProps) {
  if (!organization) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-sidebar-border px-3 py-2 text-sm text-sidebar-muted-foreground">
        No organization yet
      </div>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-qavio-gradient text-xs font-bold text-white">
            {organization.name.charAt(0).toUpperCase()}
          </span>
          <span className="flex-1 overflow-hidden">
            <span className="block truncate font-medium">{organization.name}</span>
            <span className="block truncate text-xs text-sidebar-muted-foreground">
              {organization.environment}
            </span>
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-muted-foreground" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuItem disabled>Switch organization (coming soon)</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
