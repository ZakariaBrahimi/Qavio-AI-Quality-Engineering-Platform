'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from '@qavio/ui';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { switchOrganization } from '@/app/actions/organizations';
import { CreateOrganizationForm } from '@/components/onboarding/create-organization-form';
import type { OrganizationMembership } from '@/lib/organizations';

export interface OrganizationSwitcherProps {
  organizations: OrganizationMembership[];
  currentOrganizationId: string | null;
}

export function OrganizationSwitcher({
  organizations,
  currentOrganizationId,
}: OrganizationSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);

  const current = organizations.find((org) => org.organizationId === currentOrganizationId);

  if (!current) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-sidebar-border px-3 py-2 text-sm text-sidebar-muted-foreground">
        No organization yet
      </div>
    );
  }

  function handleSwitch(organizationId: string) {
    if (organizationId === currentOrganizationId) return;
    startTransition(async () => {
      const result = await switchOrganization(organizationId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      router.push('/dashboard');
      router.refresh();
    });
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            disabled={isPending}
            className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent disabled:opacity-60"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-qavio-gradient text-xs font-bold text-white">
              {current.organizationName.charAt(0).toUpperCase()}
            </span>
            <span className="flex-1 overflow-hidden">
              <span className="block truncate font-medium">{current.organizationName}</span>
              <span className="block truncate text-xs capitalize text-sidebar-muted-foreground">
                {current.role}
              </span>
            </span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 text-sidebar-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuLabel>Your organizations</DropdownMenuLabel>
          {organizations.map((org) => (
            <DropdownMenuItem
              key={org.organizationId}
              onSelect={() => handleSwitch(org.organizationId)}
              className="justify-between"
            >
              <span className="truncate">{org.organizationName}</span>
              {org.organizationId === currentOrganizationId ? (
                <Check className="h-4 w-4 shrink-0" />
              ) : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Create organization
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create organization</DialogTitle>
            <DialogDescription>
              Start a new, separate workspace. You&apos;ll still have access to your other
              organizations.
            </DialogDescription>
          </DialogHeader>
          <CreateOrganizationForm onSuccess={() => setCreateOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
