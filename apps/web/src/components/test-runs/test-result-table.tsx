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

export interface TestResultTableProps {
  results: TestResult[];
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function TestResultTable({ results }: TestResultTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Test Case</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Duration</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {results.map((result) => (
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
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
