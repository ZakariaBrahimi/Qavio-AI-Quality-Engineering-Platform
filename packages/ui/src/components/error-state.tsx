import { AlertTriangle } from 'lucide-react';

import { cn } from '../lib/cn';
import { Button } from './button';

export interface ErrorStateProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

/**
 * For a request that actually failed (network error, 500, thrown
 * exception) — distinct from EmptyState, which is for "there is
 * legitimately nothing here yet."
 */
export function ErrorState({
  title = 'Something went wrong',
  description = 'We ran into a problem loading this. Please try again.',
  onRetry,
  retryLabel = 'Try again',
  className,
  children,
  ...props
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-destructive/30 py-16 text-center',
        className,
      )}
      {...props}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {retryLabel}
        </Button>
      ) : (
        children
      )}
    </div>
  );
}
