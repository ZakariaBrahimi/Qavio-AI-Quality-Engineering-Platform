import { ComingSoon } from '@/components/shell/coming-soon';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Reports' };

export default function ReportsPage() {
  return (
    <ComingSoon
      title="Reports"
      description="Quality reports and trends across projects ship after the core test-run loop is in place."
    />
  );
}
