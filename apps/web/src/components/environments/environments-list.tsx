import type { Environment, OrganizationRole } from '@qavio/types';
import { EmptyState } from '@qavio/ui';
import { Boxes } from 'lucide-react';

import { CreateEnvironmentDialog } from '@/components/environments/create-environment-dialog';
import { EnvironmentCard } from '@/components/environments/environment-card';
import { hasPermission } from '@/lib/rbac';

export interface EnvironmentsListProps {
  projectId: string;
  environments: Environment[];
  archivedEnvironments: Environment[];
  credentialCounts: Map<string, number>;
  role: OrganizationRole;
}

export function EnvironmentsList({
  projectId,
  environments,
  archivedEnvironments,
  credentialCounts,
  role,
}: EnvironmentsListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Environments</h2>
          <p className="text-sm text-muted-foreground">
            Where test runs against this project can point — Development, Staging, Production.
          </p>
        </div>
        {hasPermission(role, 'manage_environments') ? (
          <CreateEnvironmentDialog projectId={projectId} />
        ) : null}
      </div>

      {environments.length === 0 && archivedEnvironments.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No environments yet"
          description="Add one (e.g. Staging or Production) so there's somewhere for a test run to point."
        />
      ) : (
        <div className="space-y-3">
          {environments.map((environment) => (
            <EnvironmentCard
              key={environment.id}
              environment={environment}
              role={role}
              credentialCount={credentialCounts.get(environment.id) ?? 0}
            />
          ))}
        </div>
      )}

      {archivedEnvironments.length > 0 ? (
        <details className="rounded-lg border p-4">
          <summary className="cursor-pointer text-sm font-medium text-muted-foreground">
            {archivedEnvironments.length} archived environment
            {archivedEnvironments.length === 1 ? '' : 's'}
          </summary>
          <div className="mt-3 space-y-3">
            {archivedEnvironments.map((environment) => (
              <EnvironmentCard
                key={environment.id}
                environment={environment}
                role={role}
                credentialCount={credentialCounts.get(environment.id) ?? 0}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
