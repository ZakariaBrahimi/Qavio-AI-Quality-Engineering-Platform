import { Bug, CheckCircle2, FlaskConical, SquareStack } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EmptyState, MetricCard } from '@qavio/ui';

import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { ProjectCard } from '@/components/projects/project-card';
import { getCurrentOrganization } from '@/lib/organizations';
import { getProjects } from '@/lib/projects';

export const metadata: Metadata = { title: 'Overview' };

export default async function OverviewPage() {
  const organization = await getCurrentOrganization();
  const projects = organization ? await getProjects(organization.organizationId) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Better Quality. Faster Releases. Connect a project to get started.
          </p>
        </div>
        <CreateProjectDialog />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Projects" value={projects.length} icon={SquareStack} />
        <MetricCard label="Test Runs (7d)" value={0} icon={FlaskConical} />
        <MetricCard label="Open Bugs" value={0} icon={Bug} />
        <MetricCard label="Pass Rate" value="—" icon={CheckCircle2} />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={SquareStack}
          title="No projects yet"
          description="Connect a web, mobile, or API application to start running Qavio's quality checks against it."
        />
      ) : (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recent projects</h2>
            <Link href="/projects" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.slice(0, 6).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
