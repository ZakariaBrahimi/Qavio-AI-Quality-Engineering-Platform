import { Button, EmptyState, StatusBadge, Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@qavio/ui';
import { FlaskConical } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { getEnvironmentNameMap } from '@/lib/environments';
import { getCurrentOrganization } from '@/lib/organizations';
import { TEST_RUN_TYPE_LABELS } from '@/lib/project-constants';
import { getProjectNameMap } from '@/lib/projects';
import { hasPermission } from '@/lib/rbac';
import { getRecentTestRunsForOrg } from '@/lib/test-runs';

export const metadata: Metadata = { title: 'Test Runs' };

export default async function TestRunsPage() {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return null;
  }

  const testRuns = await getRecentTestRunsForOrg(organization.organizationId, 50);

  const [projectNames, environmentNames] = await Promise.all([
    getProjectNameMap(organization.organizationId, testRuns.map((run) => run.projectId)),
    getEnvironmentNameMap(organization.organizationId, testRuns.map((run) => run.environmentId)),
  ]);

  const canStartRun = hasPermission(organization.role, 'manage_test_workflows');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Test Runs</h1>
          <p className="text-sm text-muted-foreground">
            Queue and monitor functional QA runs against your projects.
          </p>
        </div>
        {canStartRun ? (
          <Button asChild>
            <Link href="/test-runs/new">New Test Run</Link>
          </Button>
        ) : null}
      </div>

      {testRuns.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No test runs yet"
          description="Start a test run once you've connected a project and environment."
        />
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableCaption className="sr-only">Test runs across your organization&apos;s projects</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Run</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>Environment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {testRuns.map((testRun) => (
                <TableRow key={testRun.id}>
                  <TableCell>
                    <Link
                      href={`/test-runs/${testRun.id}`}
                      className="font-medium text-foreground underline-offset-4 hover:underline focus-visible:underline"
                    >
                      Run #{testRun.id.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {projectNames.get(testRun.projectId) ?? 'Unknown project'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {environmentNames.get(testRun.environmentId) ?? 'Unknown environment'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{TEST_RUN_TYPE_LABELS[testRun.type]}</TableCell>
                  <TableCell>
                    <StatusBadge status={testRun.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    <time dateTime={testRun.createdAt}>{new Date(testRun.createdAt).toLocaleDateString()}</time>
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
