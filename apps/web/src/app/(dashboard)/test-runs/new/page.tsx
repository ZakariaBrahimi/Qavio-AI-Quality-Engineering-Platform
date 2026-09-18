import { Button } from '@qavio/ui';
import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { NewTestRunForm } from '@/components/test-runs/new-test-run-form';

export const metadata: Metadata = { title: 'New Test Run' };

export default function NewTestRunPage() {
  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/test-runs">
            <ArrowLeft className="h-4 w-4" />
            Back to Test Runs
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">New Test Run</h1>
        <p className="text-sm text-muted-foreground">
          Configure your test run and let the AI agent explore, test, and find issues in your
          application.
        </p>
      </div>

      <NewTestRunForm />
    </div>
  );
}
