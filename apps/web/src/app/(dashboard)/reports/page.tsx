import { BarChart3, Bug, CheckCircle2, Clock } from 'lucide-react';
import type { Metadata } from 'next';

import { Button, EmptyState, MetricCard } from '@qavio/ui';

import { getIssueCounts } from '@/lib/issues';
import { getCurrentOrganization } from '@/lib/organizations';
import { getAverageTestRunDuration, getTestRunCountForOrg } from '@/lib/test-runs';

export const metadata: Metadata = { title: 'Reports' };

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

export default async function ReportsPage() {
  const organization = await getCurrentOrganization();
  if (!organization) {
    return null;
  }

  const [testRunCount, issueCounts, averageDuration] = await Promise.all([
    getTestRunCountForOrg(organization.organizationId),
    getIssueCounts(organization.organizationId),
    getAverageTestRunDuration(organization.organizationId),
  ]);

  const hasData = testRunCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
          <p className="text-sm text-muted-foreground">
            Track quality trends and share results once test runs start producing data.
          </p>
        </div>
        <Button disabled>Generate Report</Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total Test Runs" value={testRunCount} icon={BarChart3} />
        <MetricCard label="Total Bugs Found" value={issueCounts.total} icon={Bug} />
        <MetricCard label="Issues Resolved" value={issueCounts.resolved} icon={CheckCircle2} />
        <MetricCard label="Avg. Test Duration" value={formatDuration(averageDuration)} icon={Clock} />
      </div>

      {!hasData ? (
        <EmptyState
          icon={BarChart3}
          title="No reports yet"
          description="Reports are generated from completed test runs. Run your first test to see quality trends here."
        />
      ) : null}
    </div>
  );
}
