import { ComingSoon } from '@/components/shell/coming-soon';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Issues' };

export default function IssuesPage() {
  return (
    <ComingSoon
      title="Issues"
      description="Detected bugs, AI analysis, and fix suggestions will appear here once test runs are producing results."
    />
  );
}
