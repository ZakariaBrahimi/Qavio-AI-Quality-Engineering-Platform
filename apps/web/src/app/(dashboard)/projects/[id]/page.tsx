import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { EnvironmentsList } from '@/components/environments/environments-list';
import { ProjectHeader } from '@/components/projects/project-header';
import { ProjectOverview } from '@/components/projects/project-overview';
import { ProjectTabs } from '@/components/projects/project-tabs';
import { getCredentialCountsByEnvironment, getEnvironments } from '@/lib/environments';
import { getRecentIssues } from '@/lib/issues';
import { getCurrentOrganization } from '@/lib/organizations';
import { getProject } from '@/lib/projects';
import { hasPermission } from '@/lib/rbac';
import { getRecentTestRuns, getTestResultSummary, getTestRunCount } from '@/lib/test-runs';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const organization = await getCurrentOrganization();
  if (!organization) return { title: 'Project' };
  const project = await getProject(organization.organizationId, params.id);
  return { title: project?.name ?? 'Project' };
}

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { env?: string };
}) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return null;
  }

  // Scoped to the caller's own organization — see lib/projects.ts. A
  // project that exists but belongs to a different organization returns
  // null here exactly like one that doesn't exist at all, so notFound()
  // below never distinguishes "wrong id" from "someone else's project."
  const project = await getProject(organization.organizationId, params.id);
  if (!project) {
    notFound();
  }

  const [activeEnvironments, archivedEnvironments, credentialCounts] = await Promise.all([
    getEnvironments(organization.organizationId, project.id),
    getEnvironments(organization.organizationId, project.id, { includeArchived: true }).then((all) =>
      all.filter((environment) => environment.archivedAt),
    ),
    getCredentialCountsByEnvironment(organization.organizationId, project.id),
  ]);

  const selectedEnvironmentId =
    activeEnvironments.find((environment) => environment.id === searchParams.env)?.id ?? null;

  const [recentTestRuns, testRunCount, testResultSummary, recentIssues] = await Promise.all([
    getRecentTestRuns(organization.organizationId, project.id, {
      environmentId: selectedEnvironmentId ?? undefined,
    }),
    getTestRunCount(organization.organizationId, project.id, {
      environmentId: selectedEnvironmentId ?? undefined,
    }),
    getTestResultSummary(organization.organizationId, project.id, {
      environmentId: selectedEnvironmentId ?? undefined,
    }),
    getRecentIssues(organization.organizationId, project.id),
  ]);

  return (
    <div className="space-y-6">
      <ProjectHeader project={project} role={organization.role} />

      <ProjectTabs
        overview={
          <ProjectOverview
            project={project}
            environments={activeEnvironments}
            selectedEnvironmentId={selectedEnvironmentId}
            recentTestRuns={recentTestRuns}
            testRunCount={testRunCount}
            testResultSummary={testResultSummary}
            recentIssues={recentIssues}
            canStartTestRun={hasPermission(organization.role, 'manage_test_workflows')}
          />
        }
        environments={
          <EnvironmentsList
            projectId={project.id}
            environments={activeEnvironments}
            archivedEnvironments={archivedEnvironments}
            credentialCounts={credentialCounts}
            role={organization.role}
          />
        }
      />
    </div>
  );
}
