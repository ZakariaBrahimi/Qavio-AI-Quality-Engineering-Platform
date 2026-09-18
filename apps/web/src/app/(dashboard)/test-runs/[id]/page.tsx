import { Button, ErrorState } from '@qavio/ui';
import Link from 'next/link';

export default function TestRunDetailsPage({ params }: { params: { id: string } }) {
  // No test runs exist yet — there is no data source to look this id up
  // against, so this is a real "not found" state, not a stand-in for a
  // page that will always be reached once the queue is wired up.
  return (
    <ErrorState
      title={`Test run "${params.id}" was not found`}
      description="Test runs will appear here once you've queued one against a connected project."
    >
      <Button asChild variant="outline" size="sm" className="mt-2">
        <Link href="/test-runs">Back to Test Runs</Link>
      </Button>
    </ErrorState>
  );
}
