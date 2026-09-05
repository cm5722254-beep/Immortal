interface SkeletonCardProps {
  count?: number;
}

export function SkeletonCard({ count = 6 }: SkeletonCardProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card">
          <div className="skeleton aspect-[2/3] w-full" />
          <div className="p-3 space-y-2">
            <div className="skeleton h-4 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </>
  );
}

export function SkeletonBanner() {
  return (
    <div className="skeleton w-full h-[70vh] min-h-[400px] rounded-none" />
  );
}

export function SkeletonDetail() {
  return (
    <div className="animate-fade-in">
      <div className="skeleton w-full h-80 rounded-none" />
      <div className="max-w-6xl mx-auto px-4 -mt-24">
        <div className="flex gap-6">
          <div className="skeleton w-48 h-72 rounded-xl shrink-0 hidden md:block" />
          <div className="flex-1 space-y-4 pt-4">
            <div className="skeleton h-8 w-2/3 rounded" />
            <div className="skeleton h-4 w-1/3 rounded" />
            <div className="skeleton h-24 w-full rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 items-center">
          <div className="skeleton w-8 h-8 rounded-full" />
          <div className="skeleton flex-1 h-4 rounded" />
          <div className="skeleton w-24 h-4 rounded" />
          <div className="skeleton w-20 h-8 rounded-lg" />
        </div>
      ))}
    </div>
  );
}
