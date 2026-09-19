import {
  Alert,
  AlertDescription,
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
  EmptyState,
  PropertyList,
  StatusBadge,
} from '@qavio/ui';
import { AlertCircle, FlaskConical, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { TestResultTable } from '@/components/test-runs/test-result-table';
import { TestRunStatusPanel } from '@/components/test-runs/test-run-status-panel';
import { getEnvironments } from '@/lib/environments';
import { getCurrentOrganization } from '@/lib/organizations';
import { TEST_RUN_TYPE_LABELS } from '@/lib/project-constants';
import { getProject } from '@/lib/projects';
import { hasPermission } from '@/lib/rbac';
import { getArtifactsForResults, getTestResults, getTestRun, type ArtifactWithUrl } from '@/lib/test-runs';

/** `pagesChecked` -> `Pages checked` — the summary's keys are producer-defined (see TestRun.summary), so this is a generic formatter, not a lookup table tied to Phase 7's specific keys. */
function humanizeSummaryKey(key: string): string {
  const spaced = key.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatSummaryValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number' || typeof value === 'string') return String(value);
  return JSON.stringify(value);
}

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const organization = await getCurrentOrganization();
  if (!organization) return { title: 'Test Run' };
  const testRun = await getTestRun(organization.organizationId, params.id);
  return { title: testRun ? `Run #${testRun.id.slice(0, 8)}` : 'Test Run' };
}

export default async function TestRunDetailsPage({ params }: { params: { id: string } }) {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return null;
  }

  // Same "wrong id and someone else's data look identical" rule as
  // projects/[id] and issues/[id].
  const testRun = await getTestRun(organization.organizationId, params.id);
  if (!testRun) {
    notFound();
  }

  const [project, environments, results] = await Promise.all([
    getProject(organization.organizationId, testRun.projectId),
    getEnvironments(organization.organizationId, testRun.projectId, { includeArchived: true }),
    getTestResults(organization.organizationId, testRun.id),
  ]);

  const artifacts = await getArtifactsForResults(
    organization.organizationId,
    results.map((result) => result.id),
  );
  const artifactsByResult = artifacts.reduce<Record<string, ArtifactWithUrl[]>>((byResult, artifact) => {
    (byResult[artifact.testResultId] ??= []).push(artifact);
    return byResult;
  }, {});

  const environment = environments.find((candidate) => candidate.id === testRun.environmentId) ?? null;
  const isActive = testRun.status === 'starting' || testRun.status === 'running';
  const summaryEntries = Object.entries(testRun.summary);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/test-runs">Test Runs</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Run #{testRun.id.slice(0, 8)}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Run #{testRun.id.slice(0, 8)}</h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={testRun.status} />
            <TestRunStatusPanel
              testRunId={testRun.id}
              status={testRun.status}
              canCancel={hasPermission(organization.role, 'manage_test_workflows')}
            />
          </div>
        </div>

        {isActive && testRun.progress ? (
          <p className="text-sm text-muted-foreground">{testRun.progress}</p>
        ) : null}
      </div>

      {testRun.status === 'failed' && testRun.errorMessage ? (
        <Alert variant="destructive">
          <AlertCircle />
          <AlertDescription>{testRun.errorMessage}</AlertDescription>
        </Alert>
      ) : null}

      {testRun.status === 'blocked' && testRun.errorMessage ? (
        <Alert variant="warning">
          <ShieldAlert />
          <AlertDescription>
            This run was blocked, not failed — the target could not be reached in a way Qavio is configured to
            authenticate. {testRun.errorMessage}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Results</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <EmptyState
                icon={FlaskConical}
                title="No results yet"
                description="Test results will appear here once this run has been executed by a worker."
              />
            ) : (
              <TestResultTable results={results} artifactsByResult={artifactsByResult} />
            )}
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
                { label: 'Environment', value: environment?.name ?? 'Unknown environment' },
                { label: 'Type', value: TEST_RUN_TYPE_LABELS[testRun.type] },
                { label: 'Status', value: <StatusBadge status={testRun.status} /> },
                {
                  label: 'Started',
                  value: testRun.startedAt ? new Date(testRun.startedAt).toLocaleString() : 'Not started',
                },
                {
                  label: 'Finished',
                  value: testRun.finishedAt ? new Date(testRun.finishedAt).toLocaleString() : '—',
                },
                { label: 'Created', value: new Date(testRun.createdAt).toLocaleString() },
              ]}
            />
          </div>

          {summaryEntries.length > 0 ? (
            <div className="rounded-lg border p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Summary</h2>
              <PropertyList
                items={summaryEntries.map(([key, value]) => ({
                  label: humanizeSummaryKey(key),
                  value: formatSummaryValue(value),
                }))}
              />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
