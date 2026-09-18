import { PLANNED_INTEGRATION_PROVIDERS } from '@qavio/integrations';
import type { Integration } from '@qavio/types';
import type { Metadata } from 'next';

import { IntegrationCard } from '@/components/integrations/integration-card';

export const metadata: Metadata = { title: 'Integrations' };

export default function IntegrationsPage() {
  const integrations: Integration[] = PLANNED_INTEGRATION_PROVIDERS.map((provider) => ({
    id: provider,
    organizationId: '',
    provider,
    isConnected: false,
    config: {},
    connectedBy: null,
    connectedAt: null,
    createdAt: new Date(0).toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect Qavio to your bug tracker to export detected issues automatically. Connecting
          and exporting ships in a later phase — these cards show what&apos;s planned.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
    </div>
  );
}
