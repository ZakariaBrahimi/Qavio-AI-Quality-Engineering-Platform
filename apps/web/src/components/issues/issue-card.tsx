import type { Bug } from '@qavio/types';
import { Card, CardContent, CardHeader, SeverityBadge } from '@qavio/ui';
import Link from 'next/link';

import { IssueStatus } from './issue-status';

export interface IssueCardProps {
  issue: Bug;
}

export function IssueCard({ issue }: IssueCardProps) {
  return (
    <Link href={`/issues/${issue.id}`}>
      <Card className="transition-colors hover:border-primary/40">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <p className="text-sm font-medium text-foreground">{issue.title}</p>
          <div className="flex shrink-0 items-center gap-2">
            <SeverityBadge severity={issue.severity} />
            <IssueStatus status={issue.status} />
          </div>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {issue.aiSummary ?? 'AI analysis pending.'}
        </CardContent>
      </Card>
    </Link>
  );
}
