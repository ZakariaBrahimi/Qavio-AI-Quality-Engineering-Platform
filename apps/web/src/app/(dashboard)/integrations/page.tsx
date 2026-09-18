import { ComingSoon } from '@/components/shell/coming-soon';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Integrations' };

export default function IntegrationsPage() {
  return (
    <ComingSoon
      title="Integrations"
      description="Exporting bugs to Jira, ClickUp, Notion, Linear, GitHub, and GitLab ships in a later phase."
    />
  );
}
