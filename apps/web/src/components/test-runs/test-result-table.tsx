import type { TestResult } from '@qavio/types';
import {
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@qavio/ui';

import type { ArtifactWithUrl } from '@/lib/test-runs';

export interface TestResultTableProps {
  results: TestResult[];
  /** Keyed by `TestResult.id` — a result with no evidence yet (still running, or an executor that doesn't capture any) simply has no entry. */
  artifactsByResult?: Record<string, ArtifactWithUrl[]>;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function TestResultTable({ results, artifactsByResult = {} }: TestResultTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Test Case</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Evidence</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((result) => {
          const artifacts = artifactsByResult[result.id] ?? [];
          const screenshot = artifacts.find((artifact) => artifact.kind === 'screenshot' && artifact.url);
          const report = artifacts.find((artifact) => artifact.kind === 'json_report' && artifact.url);

          return (
            <TableRow key={result.id}>
              <TableCell>
                <p className="font-medium text-foreground">{result.name}</p>
                {result.errorMessage ? (
                  <p className="text-xs text-destructive">{result.errorMessage}</p>
                ) : null}
              </TableCell>
              <TableCell>
                <StatusBadge status={result.status} />
              </TableCell>
              <TableCell>{formatDuration(result.durationMs)}</TableCell>
              <TableCell>
                {screenshot || report ? (
                  <div className="flex items-center gap-2">
                    {screenshot ? (
                      <a
                        href={screenshot.url ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="block overflow-hidden rounded border"
                        aria-label={`Open screenshot for ${result.name}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed Storage URL, not something next/image should cache/optimize */}
                        <img src={screenshot.url ?? undefined} alt="" className="h-10 w-16 object-cover" />
                      </a>
                    ) : null}
                    {report ? (
                      <a
                        href={report.url ?? undefined}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-primary hover:underline"
                      >
                        Report
                      </a>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
