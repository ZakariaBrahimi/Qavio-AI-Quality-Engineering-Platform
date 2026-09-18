import { Bug, Flame, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import {
  EmptyState,
  MetricCard,
  SeverityBadge,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@qavio/ui';

import { IssueStatus } from '@/components/issues/issue-status';
import { getIssueCounts, getIssuesForOrg } from '@/lib/issues';
import { getCurrentOrganization } from '@/lib/organizations';
import { getProjectNameMap } from '@/lib/projects';

export const metadata: Metadata = { title: 'Issues' };

export default async function IssuesPage() {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return null;
  }

  const [issues, counts] = await Promise.all([
    getIssuesForOrg(organization.organizationId, 100),
    getIssueCounts(organization.organizationId),
  ]);

  const projectNames = await getProjectNameMap(
    organization.organizationId,
    issues.map((issue) => issue.projectId),
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Issues</h1>
        <p className="text-sm text-muted-foreground">
          Bugs detected from failing test results, with AI analysis and severity triage.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Open Issues" value={counts.open} icon={Bug} />
        <MetricCard label="Critical" value={counts.critical} icon={Flame} />
        <MetricCard label="Unresolved High Severity" value={counts.unresolvedHigh} icon={ShieldAlert} />
      </div>

      {issues.length === 0 ? (
        <EmptyState
          icon={Bug}
          title="No issues yet"
          description="Issues are created automatically from failing test results once a test run completes."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableCaption className="sr-only">
              Issues detected across your organization&apos;s projects
            </TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Issue</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {issues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>
                    <Link
                      href={`/issues/${issue.id}`}
                      className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline"
                    >
                      {issue.title}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <SeverityBadge severity={issue.severity} />
                  </TableCell>
                  <TableCell>
                    <IssueStatus status={issue.status} />
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {projectNames.get(issue.projectId) ?? 'Unknown project'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <time dateTime={issue.createdAt}>{new Date(issue.createdAt).toLocaleDateString()}</time>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
