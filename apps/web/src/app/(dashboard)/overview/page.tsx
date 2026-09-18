import { Bug, CheckCircle2, FlaskConical, SquareStack } from 'lucide-react';
import type { Metadata } from 'next';

import { EmptyState, MetricCard } from '@qavio/ui';

import { NewProjectButton } from '@/components/projects/new-project-button';

export const metadata: Metadata = { title: 'Overview' };

export default function OverviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted-foreground">
            Better Quality. Faster Releases. Connect a project to get started.
          </p>
        </div>
        <NewProjectButton />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Projects" value={0} icon={SquareStack} />
        <MetricCard label="Test Runs (7d)" value={0} icon={FlaskConical} />
        <MetricCard label="Open Bugs" value={0} icon={Bug} />
        <MetricCard label="Pass Rate" value="—" icon={CheckCircle2} />
      </div>

      <EmptyState
        icon={SquareStack}
        title="No projects yet"
        description="Connect a web, mobile, or API application to start running Qavio's quality checks against it."
      />
    </div>
  );
}
