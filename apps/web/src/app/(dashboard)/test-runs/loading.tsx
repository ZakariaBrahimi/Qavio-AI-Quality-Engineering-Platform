import { Skeleton } from '@qavio/ui';

export default function TestRunsLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}
