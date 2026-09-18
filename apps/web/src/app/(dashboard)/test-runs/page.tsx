import { ComingSoon } from '@/components/shell/coming-soon';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Test Runs' };

export default function TestRunsPage() {
  return (
    <ComingSoon
      title="Test Runs"
      description="Queueing and monitoring Playwright test runs ships once the queue and execution plane are wired up."
    />
  );
}
