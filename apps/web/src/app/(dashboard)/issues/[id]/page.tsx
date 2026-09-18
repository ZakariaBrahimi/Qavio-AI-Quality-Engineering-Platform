import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  PropertyList,
  SeverityBadge,
} from '@qavio/ui';
import { Sparkles } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { IssueStatus } from '@/components/issues/issue-status';
import { getIssue } from '@/lib/issues';
import { getCurrentOrganization } from '@/lib/organizations';
import { getProject } from '@/lib/projects';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const organization = await getCurrentOrganization();
  if (!organization) return { title: 'Issue' };
  const issue = await getIssue(organization.organizationId, params.id);
  return { title: issue?.title ?? 'Issue' };
}

export default async function IssueDetailPage({ params }: { params: { id: string } }) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return null;
  }

  // Same "wrong id and someone else's issue look identical" rule as
  // projects/[id] — a cross-org id returns null here, never a
  // distinguishable error.
  const issue = await getIssue(organization.organizationId, params.id);
  if (!issue) {
    notFound();
  }

  const project = await getProject(organization.organizationId, issue.projectId);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/issues">Issues</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{issue.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{issue.title}</h1>
            {issue.description ? (
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{issue.description}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <SeverityBadge severity={issue.severity} />
            <IssueStatus status={issue.status} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-secondary" />
              AI analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{issue.aiSummary ?? 'AI analysis pending.'}</p>
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <div className="rounded-lg border p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Details</h2>
            <PropertyList
              items={[
                {
                  label: 'Project',
                  value: project ? (
                    <Link href={`/projects/${project.id}`} className="text-primary hover:underline">
                      {project.name}
                    </Link>
                  ) : (
                    'Unknown project'
                  ),
                },
                { label: 'Severity', value: <SeverityBadge severity={issue.severity} /> },
                { label: 'Status', value: <IssueStatus status={issue.status} /> },
                { label: 'Created', value: new Date(issue.createdAt).toLocaleString() },
              ]}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
