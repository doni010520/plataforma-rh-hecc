export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-700/40 rounded ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-gray-900/50 backdrop-blur-lg border border-emerald-500/10 rounded-lg p-6 space-y-4">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
