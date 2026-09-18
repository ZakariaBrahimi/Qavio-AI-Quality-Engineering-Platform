import { Skeleton } from '@qavio/ui';

export default function IssueDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-96" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-40 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
    </div>
  );
}
