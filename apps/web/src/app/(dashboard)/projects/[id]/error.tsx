'use client';

import { Button, ErrorState } from '@qavio/ui';
import Link from 'next/link';
import { useEffect } from 'react';

export default function ProjectDetailError({
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
      title="Couldn't load this project"
      description="Something went wrong fetching this project's data. Your connection or our database may be having a moment."
    >
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/projects">Back to projects</Link>
        </Button>
      </div>
    </ErrorState>
  );
}
