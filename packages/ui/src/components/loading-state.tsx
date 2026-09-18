import { Loader2 } from 'lucide-react';

import { cn } from '../lib/cn';

export interface LoadingStateProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
}

/**
 * For a request in flight. Use Skeleton instead when the final layout is
 * known ahead of time (a table, a card grid) — this is for the generic
 * "we don't know the shape yet" case.
 */
export function LoadingState({ label = 'Loading…', className, ...props }: LoadingStateProps) {
  return (
    <div
      role="status"
      className={cn('flex flex-col items-center justify-center gap-3 py-16 text-center', className)}
      {...props}
    >
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
