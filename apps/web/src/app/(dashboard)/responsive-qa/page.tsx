import type { Metadata } from 'next';

import { ComingSoon } from '@/components/layout/coming-soon';

export const metadata: Metadata = { title: 'Responsive QA' };

export default function ResponsiveQaPage() {
  return (
    <ComingSoon
      title="Responsive QA"
      description="Testing your app across devices and screen sizes ships in a later phase."
    />
  );
}
