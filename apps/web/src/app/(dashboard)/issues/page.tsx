import { Bug, Flame, ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';

import { EmptyState, MetricCard } from '@qavio/ui';

export const metadata: Metadata = { title: 'Issues' };

export default function IssuesPage() {
  const issues: never[] = [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Issues</h1>
        <p className="text-sm text-muted-foreground">
          Bugs detected from failing test results, with AI analysis and severity triage.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard label="Open Issues" value={0} icon={Bug} />
        <MetricCard label="Critical" value={0} icon={Flame} />
        <MetricCard label="Unresolved High Severity" value={0} icon={ShieldAlert} />
      </div>

      {issues.length === 0 ? (
        <EmptyState
          icon={Bug}
          title="No issues yet"
          description="Issues are created automatically from failing test results once a test run completes."
        />
      ) : null}
    </div>
  );
}
