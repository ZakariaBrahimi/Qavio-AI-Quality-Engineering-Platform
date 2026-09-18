import type { Metadata } from 'next';

import { ComingSoon } from '@/components/layout/coming-soon';

export const metadata: Metadata = { title: 'Design QA' };

export default function DesignQaPage() {
  return (
    <ComingSoon
      title="Design QA"
      description="Comparing your app against Figma designs and catching visual regressions ships in a later phase."
    />
  );
}
