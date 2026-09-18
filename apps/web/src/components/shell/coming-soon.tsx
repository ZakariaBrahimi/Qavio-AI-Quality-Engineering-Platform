import { Construction } from 'lucide-react';

import { EmptyState } from '@qavio/ui';

export interface ComingSoonProps {
  title: string;
  description: string;
}

/**
 * Placeholder for a route not yet implemented. Used instead of faking data
 * so it is always clear to a developer or reviewer what is real.
 */
export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <EmptyState
      icon={Construction}
      title={`${title} — coming soon`}
      description={description}
      className="mx-auto max-w-md"
    />
  );
}
