import type { Metadata } from 'next';

import { ComingSoon } from '@/components/layout/coming-soon';

export const metadata: Metadata = { title: 'Security QA' };

export default function SecurityQaPage() {
  return (
    <ComingSoon
      title="Security QA"
      description="Automated vulnerability and security scanning ships in a later phase."
    />
  );
}
