import { EmptyState } from '@qavio/ui';
import { SquareStack } from 'lucide-react';
import type { Metadata } from 'next';

import { NewProjectButton } from '@/components/projects/new-project-button';

export const metadata: Metadata = { title: 'Projects' };

export default function ProjectsPage() {
  // No projects backend is wired up yet — this is always the real state,
  // not a placeholder standing in for data.
  const projects: never[] = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Connect a web, mobile, or API application to start running Qavio&apos;s quality
            checks against it.
          </p>
        </div>
        <NewProjectButton />
      </div>

      {projects.length === 0 ? (
        <EmptyState
          icon={SquareStack}
          title="No projects yet"
          description="Create your first project to configure environments and start a test run."
        />
      ) : null}
    </div>
  );
}
