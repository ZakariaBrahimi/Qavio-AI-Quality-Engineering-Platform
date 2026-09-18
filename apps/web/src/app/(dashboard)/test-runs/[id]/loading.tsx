import { Skeleton } from '@qavio/ui';

export default function TestRunDetailLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Skeleton className="h-64 rounded-lg" />
        <Skeleton className="h-72 rounded-lg" />
      </div>
    </div>
  );
}
