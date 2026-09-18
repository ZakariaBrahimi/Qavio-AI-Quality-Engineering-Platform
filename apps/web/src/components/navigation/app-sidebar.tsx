'use client';

import { cn, QavioLogo } from '@qavio/ui';
import { Zap } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { OrganizationMembership } from '@/lib/organizations';

import { NAV_ITEMS } from './nav-items';
import { OrganizationSwitcher } from './org-switcher';

export interface AppSidebarProps {
  className?: string;
  /** Called after a nav link is clicked — used to close the mobile drawer. */
  onNavigate?: () => void;
  organizations: OrganizationMembership[];
  currentOrganizationId: string | null;
}

export function AppSidebar({
  className,
  onNavigate,
  organizations,
  currentOrganizationId,
}: AppSidebarProps) {
  const pathname = usePathname();

  return (
    <div
      className={cn(
        'flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground',
        className,
      )}
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-5">
        <QavioLogo tone="light" />
      </div>

      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                isActive && 'bg-sidebar-accent text-sidebar-accent-foreground',
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-3 border-t border-sidebar-border p-3">
        <div className="rounded-lg bg-sidebar-accent p-3">
          <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-primary/20 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <p className="text-sm font-medium text-sidebar-foreground">Automate your QA</p>
          <p className="mt-1 text-xs text-sidebar-muted-foreground">
            Set up CI/CD and run tests on every pull request.
          </p>
          <Link
            href="/integrations"
            onClick={onNavigate}
            className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-md bg-primary text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Configure CI/CD
          </Link>
        </div>

        <OrganizationSwitcher
          organizations={organizations}
          currentOrganizationId={currentOrganizationId}
        />
      </div>
    </div>
  );
}
