import { type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

import { cn } from '../lib/cn';
import { Card, CardContent, CardHeader, CardTitle } from './card';

export interface MetricCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  /** Percentage change vs. the previous period, e.g. 12.5 or -4. */
  trend?: number;
}

export function MetricCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
  ...props
}: MetricCardProps) {
  const isPositive = typeof trend === 'number' && trend >= 0;
  const TrendIcon = isPositive ? TrendingUp : TrendingDown;

  return (
    <Card className={cn(className)} {...props}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        {Icon ? <Icon className="h-4 w-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {typeof trend === 'number' ? (
          <p
            className={cn(
              'mt-1 flex items-center gap-1 text-xs',
              isPositive ? 'text-success' : 'text-destructive',
            )}
          >
            <TrendIcon className="h-3.5 w-3.5" />
            {Math.abs(trend)}% vs last period
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
