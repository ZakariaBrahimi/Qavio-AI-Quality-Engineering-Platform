'use client';

import { canTransitionTestRunStatus, type TestRunStatus } from '@qavio/types';
import { Button, toast } from '@qavio/ui';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { cancelTestRun } from '@/app/(dashboard)/test-runs/actions';
import { createClient } from '@/lib/supabase/browser';

export interface TestRunStatusPanelProps {
  testRunId: string;
  status: TestRunStatus;
  canCancel: boolean;
}

/**
 * Subscribes to Supabase Realtime for this one row so QUEUED -> STARTING
 * -> RUNNING -> COMPLETED/FAILED appear without a manual refresh — see
 * supabase/migrations/20250201001800_test_run_queue_infra.sql, which adds
 * `test_runs` to the `supabase_realtime` publication (RLS still applies:
 * this only ever receives events for rows the caller could already
 * SELECT). Re-fetches via `router.refresh()` on each change instead of
 * patching state locally, so the server component's data (results,
 * timestamps) stays the single source of truth. Also renders the Cancel
 * button, since both need the same "is this run still active" check.
 */
export function TestRunStatusPanel({ testRunId, status, canCancel }: TestRunStatusPanelProps) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);

  const isFinished = status === 'completed' || status === 'failed' || status === 'cancelled';

  useEffect(() => {
    if (isFinished) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`test-run-${testRunId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'test_runs', filter: `id=eq.${testRunId}` },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [testRunId, isFinished, router]);

  async function handleCancel() {
    setIsCancelling(true);
    const result = await cancelTestRun({ testRunId });
    setIsCancelling(false);

    if (!result.ok) {
      toast.error(result.error);
      return;
    }

    toast.success('Test run cancelled.');
    router.refresh();
  }

  if (!canCancel || !canTransitionTestRunStatus(status, 'cancelled')) return null;

  return (
    <Button variant="outline" size="sm" onClick={handleCancel} disabled={isCancelling}>
      {isCancelling ? 'Cancelling…' : 'Cancel run'}
    </Button>
  );
}
