import { CheckCircle2, CircleDot, Clock, MinusCircle, Sparkles, XCircle } from 'lucide-react';

import { cn } from '../lib/cn';

/**
 * Statuses shared across test runs, test run jobs, and test results. Kept
 * as a superset union (rather than importing @qavio/types) so this
 * package has no dependency on domain-specific packages.
 */
export type Status =
  | 'created'
  | 'queued'
  | 'starting'
  | 'running'
  | 'analyzing'
  | 'active'
  | 'delayed'
  | 'completed'
  | 'passed'
  | 'failed'
  | 'cancelled'
  | 'error'
  | 'skipped'
  | 'blocked';

const STATUS_CONFIG: Record<
  Status,
  { label: string; icon: typeof CheckCircle2; className: string }
> = {
  created: { label: 'Created', icon: Clock, className: 'bg-muted text-muted-foreground' },
  queued: { label: 'Queued', icon: Clock, className: 'bg-muted text-muted-foreground' },
  starting: { label: 'Starting', icon: CircleDot, className: 'bg-primary/10 text-primary' },
  running: { label: 'Running', icon: CircleDot, className: 'bg-primary/10 text-primary' },
  analyzing: { label: 'Analyzing', icon: Sparkles, className: 'bg-secondary/10 text-secondary' },
  active: { label: 'Active', icon: CircleDot, className: 'bg-primary/10 text-primary' },
  delayed: { label: 'Delayed', icon: Clock, className: 'bg-warning/10 text-warning' },
  completed: { label: 'Completed', icon: CheckCircle2, className: 'bg-success/10 text-success' },
  passed: { label: 'Passed', icon: CheckCircle2, className: 'bg-success/10 text-success' },
  failed: { label: 'Failed', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  cancelled: { label: 'Cancelled', icon: MinusCircle, className: 'bg-muted text-muted-foreground' },
  error: { label: 'Error', icon: XCircle, className: 'bg-destructive/10 text-destructive' },
  skipped: { label: 'Skipped', icon: MinusCircle, className: 'bg-muted text-muted-foreground' },
  blocked: { label: 'Blocked', icon: MinusCircle, className: 'bg-warning/10 text-warning' },
};

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: Status;
}

export function StatusBadge({ status, className, ...props }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        config.className,
        className,
      )}
      {...props}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}
