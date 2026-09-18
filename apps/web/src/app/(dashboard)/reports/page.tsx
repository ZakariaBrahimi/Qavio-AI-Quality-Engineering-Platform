import { BarChart3, Bug, CheckCircle2, Clock } from 'lucide-react';
import type { Metadata } from 'next';

import { Button, EmptyState, MetricCard } from '@qavio/ui';

export const metadata: Metadata = { title: 'Reports' };

export default function ReportsPage() {
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
        <MetricCard label="Total Test Runs" value={0} icon={BarChart3} />
        <MetricCard label="Total Bugs Found" value={0} icon={Bug} />
        <MetricCard label="Issues Resolved" value={0} icon={CheckCircle2} />
        <MetricCard label="Avg. Test Duration" value="—" icon={Clock} />
      </div>

      <EmptyState
        icon={BarChart3}
        title="No reports yet"
        description="Reports are generated from completed test runs. Run your first test to see quality trends here."
      />
    </div>
  );
}
