import { ComingSoon } from '@/components/shell/coming-soon';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Team' };

export default function TeamPage() {
  return (
    <ComingSoon
      title="Team"
      description="Inviting teammates and managing organization membership ships alongside authentication."
    />
  );
}
