import type { Integration, IntegrationProvider } from '@qavio/types';
import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from '@qavio/ui';
import { Plug } from 'lucide-react';

const PROVIDER_LABEL: Record<IntegrationProvider, string> = {
  jira: 'Jira',
  clickup: 'ClickUp',
  notion: 'Notion',
  linear: 'Linear',
  github: 'GitHub',
  gitlab: 'GitLab',
};

export interface IntegrationCardProps {
  integration: Integration;
  onConfigure?: () => void;
}

export function IntegrationCard({ integration, onConfigure }: IntegrationCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Plug className="h-4 w-4" />
          </span>
          <CardTitle className="text-base">{PROVIDER_LABEL[integration.provider]}</CardTitle>
        </div>
        <Badge variant={integration.isConnected ? 'success' : 'outline'}>
          {integration.isConnected ? 'Connected' : 'Not connected'}
        </Badge>
      </CardHeader>
      <CardContent>
        <Button variant="outline" size="sm" onClick={onConfigure}>
          {integration.isConnected ? 'Configure' : 'Connect'}
        </Button>
      </CardContent>
    </Card>
  );
}
