'use client';

import type { OrganizationRole, Project } from '@qavio/types';
import {
  Badge,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
} from '@qavio/ui';
import { Archive, ArchiveRestore, Globe, MoreVertical, Pencil, Smartphone, Terminal, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { archiveProject, deleteProject, restoreProject } from '@/app/(dashboard)/projects/actions';
import { EditProjectDialog } from '@/components/projects/edit-project-dialog';
import { hasPermission } from '@/lib/rbac';

const PLATFORM_ICON = { web: Globe, mobile: Smartphone, api: Terminal } as const;

export interface ProjectHeaderProps {
  project: Project;
  role: OrganizationRole;
}

export function ProjectHeader({ project, role }: ProjectHeaderProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editOpen, setEditOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const canManage = hasPermission(role, 'manage_projects');
  const canDelete = hasPermission(role, 'delete_project');
  const isArchived = Boolean(project.archivedAt);
  const Icon = PLATFORM_ICON[project.platform];

  function handleArchiveToggle() {
    startTransition(async () => {
      const result = isArchived
        ? await restoreProject({ projectId: project.id })
        : await archiveProject({ projectId: project.id });
      setArchiveOpen(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(isArchived ? 'Project restored.' : 'Project archived.');
      router.refresh();
    });
  }

  function handleDelete() {
    startTransition(async () => {
      const result = await deleteProject({ projectId: project.id });
      setDeleteOpen(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success('Project deleted.');
      router.push('/projects');
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/projects">Projects</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{project.name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{project.name}</h1>
              {isArchived ? <Badge variant="outline">Archived</Badge> : null}
            </div>
            {project.description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{project.description}</p>
            ) : null}
          </div>
        </div>

        {canManage ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Project actions" disabled={isPending}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setEditOpen(true)}>
                <Pencil className="h-4 w-4" />
                Edit project
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setArchiveOpen(true)}>
                {isArchived ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                {isArchived ? 'Restore project' : 'Archive project'}
              </DropdownMenuItem>
              {canDelete ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => setDeleteOpen(true)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete project
                  </DropdownMenuItem>
                </>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      <EditProjectDialog project={project} open={editOpen} onOpenChange={setEditOpen} />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={isArchived ? 'Restore this project?' : 'Archive this project?'}
        description={
          isArchived
            ? 'It will show up as active again in your project list.'
            : "It won't be deleted — you can restore it later. It'll be hidden from the active project list."
        }
        confirmLabel={isArchived ? 'Restore' : 'Archive'}
        isConfirming={isPending}
        onConfirm={handleArchiveToggle}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this project permanently?"
        description={`This deletes "${project.name}" and everything under it — environments, test suites, test runs, and issues. This cannot be undone.`}
        confirmLabel="Delete permanently"
        variant="destructive"
        isConfirming={isPending}
        onConfirm={handleDelete}
      />
    </div>
  );
}
