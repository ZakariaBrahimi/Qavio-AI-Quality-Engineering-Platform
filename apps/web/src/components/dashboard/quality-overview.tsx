import { Card, CardContent, CardHeader, CardTitle } from '@qavio/ui';

import type { TestResultSummary } from '@/lib/test-runs';

export interface QualityOverviewProps {
  summary: TestResultSummary;
}

const SEGMENTS: { key: keyof Omit<TestResultSummary, 'total'>; label: string; barClassName: string; dotClassName: string }[] = [
  { key: 'passed', label: 'Passed', barClassName: 'bg-success', dotClassName: 'bg-success' },
  { key: 'failed', label: 'Failed', barClassName: 'bg-destructive', dotClassName: 'bg-destructive' },
  { key: 'blocked', label: 'Blocked', barClassName: 'bg-warning', dotClassName: 'bg-warning' },
  { key: 'skipped', label: 'Skipped', barClassName: 'bg-muted-foreground/40', dotClassName: 'bg-muted-foreground/40' },
];

/** Pass/fail breakdown as a proportional stacked bar — no charting library, just real counts. */
export function QualityOverview({ summary }: QualityOverviewProps) {
  const passRate = summary.total > 0 ? Math.round((summary.passed / summary.total) * 100) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Quality overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.total === 0 ? (
          <p className="text-sm text-muted-foreground">
            No test results yet. Once a test run finishes, its pass/fail breakdown shows up here.
          </p>
        ) : (
          <>
            <div>
              <p className="text-2xl font-semibold tracking-tight">{passRate}%</p>
              <p className="text-xs text-muted-foreground">
                pass rate across {summary.total} result{summary.total === 1 ? '' : 's'}
              </p>
            </div>

            <div
              aria-hidden="true"
              className="flex h-2 w-full overflow-hidden rounded-full bg-muted"
            >
              {SEGMENTS.map((segment) =>
                summary[segment.key] > 0 ? (
                  <div
                    key={segment.key}
                    className={segment.barClassName}
                    style={{ width: `${(summary[segment.key] / summary.total) * 100}%` }}
                  />
                ) : null,
              )}
            </div>

            <ul className="grid grid-cols-2 gap-2">
              {SEGMENTS.map((segment) => (
                <li key={segment.key} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`h-2 w-2 shrink-0 rounded-full ${segment.dotClassName}`} aria-hidden="true" />
                  {segment.label}
                  <span className="ml-auto font-medium text-foreground">{summary[segment.key]}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}
