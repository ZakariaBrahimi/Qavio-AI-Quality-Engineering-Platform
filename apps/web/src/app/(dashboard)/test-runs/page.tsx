import { Button, EmptyState } from '@qavio/ui';
import { FlaskConical } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Test Runs' };

export default function TestRunsPage() {
  const testRuns: never[] = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Test Runs</h1>
          <p className="text-sm text-muted-foreground">
            Queue and monitor functional QA runs against your projects.
          </p>
        </div>
        <Button asChild>
          <Link href="/test-runs/new">New Test Run</Link>
        </Button>
      </div>

      {testRuns.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title="No test runs yet"
          description="Start a test run once you've connected a project and environment."
        />
      ) : null}
    </div>
  );
}
