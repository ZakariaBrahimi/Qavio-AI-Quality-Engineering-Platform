'use client';

import { Button, ErrorState } from '@qavio/ui';
import Link from 'next/link';
import { useEffect } from 'react';

export default function IssueDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error(error);
  }, [error]);

  return (
    <ErrorState
      title="Couldn't load this issue"
      description="Something went wrong fetching this issue's data. Your connection or our database may be having a moment."
    >
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/issues">Back to issues</Link>
        </Button>
      </div>
    </ErrorState>
  );
}
