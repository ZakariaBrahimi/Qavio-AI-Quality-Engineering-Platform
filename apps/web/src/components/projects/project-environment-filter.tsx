'use client';

import type { Environment } from '@qavio/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@qavio/ui';
import { useRouter } from 'next/navigation';

export interface ProjectEnvironmentFilterProps {
  projectId: string;
  environments: Environment[];
  selectedEnvironmentId: string | null;
}

/**
 * Filters the dashboard's recent-runs/pass-fail data to one environment.
 * Backed by the `?env=` query param (not client state) so the filtered
 * data comes from a real server re-fetch, same as every other data view
 * in this app — never re-derived from data already in the browser.
 */
export function ProjectEnvironmentFilter({
  projectId,
  environments,
  selectedEnvironmentId,
}: ProjectEnvironmentFilterProps) {
  const router = useRouter();

  if (environments.length === 0) {
    return null;
  }

  function handleChange(value: string) {
    const target = value === 'all' ? `/projects/${projectId}` : `/projects/${projectId}?env=${value}`;
    router.push(target);
  }

  return (
    <Select value={selectedEnvironmentId ?? 'all'} onValueChange={handleChange}>
      <SelectTrigger className="w-48">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All environments</SelectItem>
        {environments.map((environment) => (
          <SelectItem key={environment.id} value={environment.id}>
            {environment.name}
            {environment.isDefault ? ' (default)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
