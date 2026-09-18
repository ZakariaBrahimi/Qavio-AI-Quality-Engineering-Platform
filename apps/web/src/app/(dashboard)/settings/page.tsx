import { ComingSoon } from '@/components/layout/coming-soon';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Settings' };

export default function SettingsPage() {
  return (
    <ComingSoon
      title="Settings"
      description="Organization, environment, and account settings ship alongside authentication."
    />
  );
}
