import { Bug, CheckCircle2, FlaskConical, SquareStack } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { EmptyState, MetricCard } from '@qavio/ui';

import { ActivityFeed } from '@/components/dashboard/activity-feed';
import { QualityOverview } from '@/components/dashboard/quality-overview';
import { IssueCard } from '@/components/issues/issue-card';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import { TestRunCard } from '@/components/test-runs/test-run-card';
import { getRecentActivity } from '@/lib/activity';
import { getIssueCounts, getIssuesForOrg } from '@/lib/issues';
import { getCurrentOrganization } from '@/lib/organizations';
import { getProjects } from '@/lib/projects';
import { hasPermission } from '@/lib/rbac';
import { getRecentTestRunsForOrg, getTestResultSummaryForOrg, getTestRunCountForOrg } from '@/lib/test-runs';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return null;
  }

  const canViewActivity = hasPermission(organization.role, 'view_audit_log');

  const [projects, recentTestRuns, testRunCount, issueCounts, recentIssues, testResultSummary, recentActivity] =
    await Promise.all([
      getProjects(organization.organizationId),
      getRecentTestRunsForOrg(organization.organizationId, 4),
      getTestRunCountForOrg(organization.organizationId),
      getIssueCounts(organization.organizationId),
      getIssuesForOrg(organization.organizationId, 4),
      getTestResultSummaryForOrg(organization.organizationId),
      canViewActivity ? getRecentActivity(organization.organizationId, 8) : Promise.resolve([]),
    ]);

  const passRate =
    testResultSummary.total > 0
      ? `${Math.round((testResultSummary.passed / testResultSummary.total) * 100)}%`
      : '—';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Better Quality. Faster Releases.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Projects" value={projects.length} icon={SquareStack} />
        <MetricCard label="Test Runs" value={testRunCount} icon={FlaskConical} />
        <MetricCard label="Open Issues" value={issueCounts.open} icon={Bug} />
        <MetricCard label="Pass Rate" value={passRate} icon={CheckCircle2} />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={SquareStack}
          title="No projects yet"
          description="Connect a web, mobile, or API application to start running Qavio's quality checks against it."
          action={<CreateProjectDialog />}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section>
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
                  description="Start a test run from a project once it has an environment configured."
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {recentTestRuns.map((testRun) => (
                    <TestRunCard key={testRun.id} testRun={testRun} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold tracking-tight">Open issues</h2>
                <Link href="/issues" className="text-sm font-medium text-primary hover:underline">
                  View all
                </Link>
              </div>
              {recentIssues.length === 0 ? (
                <EmptyState
                  icon={Bug}
                  title="No issues yet"
                  description="Issues found during test runs will show up here."
                />
              ) : (
                <div className="space-y-3">
                  {recentIssues.map((issue) => (
                    <IssueCard key={issue.id} issue={issue} />
                  ))}
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <QualityOverview summary={testResultSummary} />
            <ActivityFeed entries={recentActivity} canView={canViewActivity} />
          </div>
        </div>
      )}
    </div>
  );
}
