import type { BugStatus } from '@qavio/types';
import { Badge, type BadgeProps } from '@qavio/ui';

const STATUS_CONFIG: Record<BugStatus, { label: string; variant: BadgeProps['variant'] }> = {
  open: { label: 'Open', variant: 'destructive' },
  investigating: { label: 'Investigating', variant: 'warning' },
  fixed: { label: 'Fixed', variant: 'success' },
  wont_fix: { label: "Won't Fix", variant: 'outline' },
  closed: { label: 'Closed', variant: 'secondary' },
};

export function IssueStatus({ status }: { status: BugStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
