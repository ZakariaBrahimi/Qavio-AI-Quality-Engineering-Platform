'use client';

import type { Environment, OrganizationRole } from '@qavio/types';
import {
  Badge,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from '@qavio/ui';
import { Archive, ArchiveRestore, ExternalLink, KeyRound, MoreVertical, Pencil, Star, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import {
  archiveEnvironment,
  deleteEnvironment,
  restoreEnvironment,
  setDefaultEnvironment,
} from '@/app/(dashboard)/projects/[id]/actions';
import { EditEnvironmentDialog } from '@/components/environments/edit-environment-dialog';
import { ENVIRONMENT_KIND_LABELS } from '@/lib/project-constants';
import { hasPermission } from '@/lib/rbac';

export interface EnvironmentCardProps {
  environment: Environment;
  role: OrganizationRole;
  credentialCount: number;
}

export function EnvironmentCard({ environment, role, credentialCount }: EnvironmentCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canManage = hasPermission(role, 'manage_environments');
  const canDelete = hasPermission(role, 'delete_environment');
  const isArchived = Boolean(environment.archivedAt);

  function handleSetDefault() {
    startTransition(async () => {
      const result = await setDefaultEnvironment({ environmentId: environment.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`${environment.name} is now the default environment.`);
      router.refresh();
    });
  }

  function handleArchiveToggle() {
    startTransition(async () => {
      const result = isArchived
        ? await restoreEnvironment({ environmentId: environment.id, projectId: environment.projectId })
        : await archiveEnvironment({ environmentId: environment.id, projectId: environment.projectId });
      setArchiveOpen(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isArchived ? 'Environment restored.' : 'Environment archived.');
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteEnvironment({ environmentId: environment.id, projectId: environment.projectId });
      setDeleteOpen(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Environment deleted.');
      router.refresh();
    });
  }

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-medium text-foreground">{environment.name}</p>
            <Badge variant="outline" className="capitalize">
              {ENVIRONMENT_KIND_LABELS[environment.kind]}
            </Badge>
            {environment.isDefault ? (
              <Badge className="gap-1">
                <Star className="h-3 w-3" />
                Default
              </Badge>
            ) : null}
            {isArchived ? <Badge variant="outline">Archived</Badge> : null}
          </div>
          <a
            href={environment.baseUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-primary hover:underline"
          >
            {environment.baseUrl}
            <ExternalLink className="h-3 w-3" />
          </a>
          {credentialCount > 0 ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <KeyRound className="h-3.5 w-3.5" />
              {credentialCount} credential{credentialCount === 1 ? '' : 's'} configured
            </p>
          ) : null}
        </div>

        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={`${environment.name} actions`} disabled={isPending}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit
              </DropdownMenuItem>
              {!environment.isDefault && !isArchived ? (
                <DropdownMenuItem onSelect={handleSetDefault}>
                  <Star className="h-4 w-4" />
                  Set as default
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>
                {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {isArchived ? 'Restore' : 'Archive'}
              </DropdownMenuItem>
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <EditEnvironmentDialog environment={environment} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={isArchived ? 'Restore this environment?' : 'Archive this environment?'}
        description={
          isArchived
            ? "It'll be selectable for test runs again."
            : `${environment.name} will be hidden from selection${environment.isDefault ? ' and is no longer the default' : ''}. You can restore it later.`
        }
        confirmLabel={isArchived ? 'Restore' : 'Archive'}
        isConfirming={isPending}
        onConfirm={handleArchiveToggle}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this environment permanently?"
        description={`This deletes "${environment.name}" and cannot be undone.`}
        confirmLabel="Delete permanently"
        variant="destructive"
        isConfirming={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
