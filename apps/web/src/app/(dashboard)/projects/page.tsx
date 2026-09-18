import { SquareStack } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EmptyState } from '@qavio/ui';

import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { ProjectCard } from '@/components/projects/project-card';
import { getCurrentOrganization } from '@/lib/organizations';
import { getProjects } from '@/lib/projects';

export const metadata: Metadata = { title: 'Projects' };

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: { archived?: string };
}) {
  const organization = await getCurrentOrganization();
  const showArchived = searchParams.archived === '1';

  if (!organization) {
    return null;
  }

  const projects = await getProjects(organization.organizationId, { includeArchived: showArchived });
  const visibleProjects = showArchived ? projects.filter((p) => p.archivedAt) : projects;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Connect a web, mobile, or API application to start running Qavio&apos;s quality
            checks against it.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      <div className="flex items-center gap-4 border-b">
        <Link
          href="/projects"
          className={`border-b-2 px-1 pb-2 text-sm font-medium ${
            !showArchived
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Active
        </Link>
        <Link
          href="/projects?archived=1"
          className={`border-b-2 px-1 pb-2 text-sm font-medium ${
            showArchived
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Archived
        </Link>
      </div>

      {visibleProjects.length === 0 ? (
        <EmptyState
          icon={SquareStack}
          title={showArchived ? 'No archived projects' : 'No projects yet'}
          description={
            showArchived
              ? 'Projects you archive will show up here.'
              : "Create your first project to configure environments and start a test run."
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
