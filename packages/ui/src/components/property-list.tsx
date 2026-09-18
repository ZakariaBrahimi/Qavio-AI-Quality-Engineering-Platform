import { type LucideIcon } from 'lucide-react';

import { cn } from '../lib/cn';

export interface PropertyRow {
  icon?: LucideIcon;
  label: string;
  value: React.ReactNode;
}

export interface PropertyListProps extends React.HTMLAttributes<HTMLDListElement> {
  items: PropertyRow[];
}

/**
 * Label/value rows used in detail sidebars — "Test Run Details",
 * "Test Run Summary", and similar property panels.
 */
export function PropertyList({ items, className, ...props }: PropertyListProps) {
  return (
    <dl className={cn('space-y-3', className)} {...props}>
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.label} className="flex items-center justify-between gap-3 text-sm">
            <dt className="flex items-center gap-2 text-muted-foreground">
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {item.label}
            </dt>
            <dd className="font-medium text-foreground">{item.value}</dd>
          </div>
        );
      })}
    </dl>
  );
}
