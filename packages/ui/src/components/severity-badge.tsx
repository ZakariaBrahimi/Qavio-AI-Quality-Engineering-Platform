import { cn } from '../lib/cn';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
};

const SEVERITY_CLASSNAME: Record<Severity, string> = {
  critical: 'bg-severity-critical/10 text-severity-critical',
  high: 'bg-severity-high/10 text-severity-high',
  medium: 'bg-severity-medium/10 text-severity-medium',
  low: 'bg-severity-low/10 text-severity-low',
};

export interface SeverityBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  severity: Severity;
}

/** Distinct from StatusBadge: severity describes impact, not run/result outcome. */
export function SeverityBadge({ severity, className, ...props }: SeverityBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        SEVERITY_CLASSNAME[severity],
        className,
      )}
      {...props}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {SEVERITY_LABEL[severity]}
    </span>
  );
}
