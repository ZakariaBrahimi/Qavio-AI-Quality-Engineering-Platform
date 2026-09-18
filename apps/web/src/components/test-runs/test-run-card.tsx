import type { TestRun } from '@qavio/types';
import { Card, CardContent, CardHeader, StatusBadge } from '@qavio/ui';
import Link from 'next/link';

export interface TestRunCardProps {
  testRun: TestRun;
}

const TYPE_LABEL: Record<TestRun['type'], string> = {
  functional: 'Functional',
  visual: 'Visual',
  responsive: 'Responsive',
  security: 'Security',
};

export function TestRunCard({ testRun }: TestRunCardProps) {
  return (
    <Link href={`/test-runs/${testRun.id}`}>
      <Card className="transition-colors hover:border-primary/40">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <p className="text-sm font-medium text-foreground">
              Run #{testRun.id.slice(0, 8)}
            </p>
            <p className="text-xs text-muted-foreground">{TYPE_LABEL[testRun.type]} run</p>
          </div>
          <StatusBadge status={testRun.status} />
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {testRun.startedAt
            ? `Started ${new Date(testRun.startedAt).toLocaleString()}`
            : 'Not started yet'}
        </CardContent>
      </Card>
    </Link>
  );
}
