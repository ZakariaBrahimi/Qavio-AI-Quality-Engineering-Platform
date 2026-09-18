import { Card, CardContent, CardHeader, CardTitle, EmptyState } from '@qavio/ui';
import { History } from 'lucide-react';

import type { ActivityEntry } from '@/lib/activity';

const ACTION_LABEL: Record<string, string> = {
  project_created: 'created project',
  project_archived: 'archived project',
  project_deleted: 'deleted project',
  environment_created: 'added environment',
  invitation_created: 'invited a member',
  member_removed: 'removed a member',
  member_role_changed: "changed a member's role",
};

function describeAction(action: string): string {
  return ACTION_LABEL[action] ?? action.replace(/_/g, ' ');
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMinutes = Math.round(diffMs / 60_000);
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

export interface ActivityFeedProps {
  entries: ActivityEntry[];
  /** Whether the caller's role can read the audit log at all (admin+, per RLS) — a lower role gets an explanatory note instead of a misleading empty list. */
  canView: boolean;
}

export function ActivityFeed({ entries, canView }: ActivityFeedProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Recent activity</CardTitle>
      </CardHeader>
      <CardContent>
        {!canView ? (
          <p className="text-sm text-muted-foreground">
            Recent activity is visible to organization admins and owners.
          </p>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={History}
            title="No recent activity"
            description="Actions like creating a project or inviting a teammate will show up here."
          />
        ) : (
          <ol className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start justify-between gap-3 text-sm">
                <p className="text-foreground">
                  <span className="font-medium">{entry.actorName ?? 'Someone'}</span>{' '}
                  <span className="text-muted-foreground">{describeAction(entry.action)}</span>
                </p>
                <time
                  dateTime={entry.createdAt}
                  title={new Date(entry.createdAt).toLocaleString()}
                  className="shrink-0 whitespace-nowrap text-xs text-muted-foreground"
                >
                  {relativeTime(entry.createdAt)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
