import type { Environment, Issue, Project, TestRun } from '@qavio/types';
import { EmptyState, MetricCard } from '@qavio/ui';
import { Bug, CheckCircle2, FlaskConical, Play, XCircle } from 'lucide-react';
import Link from 'next/link';

import { IssueCard } from '@/components/issues/issue-card';
import { ProjectEnvironmentFilter } from '@/components/projects/project-environment-filter';
import { TestRunCard } from '@/components/test-runs/test-run-card';
import type { TestResultSummary } from '@/lib/test-runs';

export interface ProjectOverviewProps {
  project: Project;
  environments: Environment[];
  selectedEnvironmentId: string | null;
  recentTestRuns: TestRun[];
  testRunCount: number;
  testResultSummary: TestResultSummary;
  recentIssues: Issue[];
  canStartTestRun: boolean;
}

export function ProjectOverview({
  project,
  environments,
  selectedEnvironmentId,
  recentTestRuns,
  testRunCount,
  testResultSummary,
  recentIssues,
  canStartTestRun,
}: ProjectOverviewProps) {
  const passRate =
    testResultSummary.total > 0
      ? `${Math.round((testResultSummary.passed / testResultSummary.total) * 100)}%`
      : '—';

  const startRunHref = `/test-runs/new?project=${project.id}${
    selectedEnvironmentId ? `&environment=${selectedEnvironmentId}` : ''
  }`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ProjectEnvironmentFilter
          projectId={project.id}
          environments={environments}
          selectedEnvironmentId={selectedEnvironmentId}
        />
        {canStartTestRun ? (
          <Link
            href={environments.length > 0 ? startRunHref : '#environments'}
            aria-disabled={environments.length === 0}
            className={
              environments.length === 0
                ? 'pointer-events-none inline-flex h-9 items-center gap-2 rounded-md bg-muted px-4 text-sm font-medium text-muted-foreground'
                : 'inline-flex h-9 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90'
            }
          >
            <Play className="h-4 w-4" />
            Start Test Run
          </Link>
        ) : null}
      </div>

      {environments.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Add an environment below before starting a test run.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Test Runs" value={testRunCount} icon={FlaskConical} />
        <MetricCard label="Passed" value={testResultSummary.passed} icon={CheckCircle2} />
        <MetricCard label="Failed" value={testResultSummary.failed} icon={XCircle} />
        <MetricCard label="Pass Rate" value={passRate} icon={CheckCircle2} />
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent test runs</h2>
          <Link href="/test-runs" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {recentTestRuns.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title="No test runs yet"
            description={
              canStartTestRun
                ? 'Start your first test run to see results here.'
                : "This project hasn't had any test runs yet."
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recentTestRuns.map((testRun) => (
              <TestRunCard key={testRun.id} testRun={testRun} />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Recent issues</h2>
          <Link href="/issues" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </div>
        {recentIssues.length === 0 ? (
          <EmptyState icon={Bug} title="No issues yet" description="Issues found during test runs will show up here." />
        ) : (
          <div className="space-y-3">
            {recentIssues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
