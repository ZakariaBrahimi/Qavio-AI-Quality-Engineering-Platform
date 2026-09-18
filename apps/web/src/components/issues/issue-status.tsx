import type { IssueStatus as IssueStatusValue } from '@qavio/types';
import { Badge, type BadgeProps } from '@qavio/ui';

const STATUS_CONFIG: Record<IssueStatusValue, { label: string; variant: BadgeProps['variant'] }> = {
  open: { label: 'Open', variant: 'destructive' },
  in_progress: { label: 'In Progress', variant: 'warning' },
  resolved: { label: 'Resolved', variant: 'success' },
  reopened: { label: 'Reopened', variant: 'destructive' },
  ignored: { label: 'Ignored', variant: 'outline' },
  duplicate: { label: 'Duplicate', variant: 'secondary' },
};

export function IssueStatus({ status }: { status: IssueStatusValue }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
