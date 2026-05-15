/**
 * Skeleton placeholders. Used instead of plain "Loading…" text so the layout
 * stays stable and the perceived load is faster.
 */

export function SkeletonLine({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-zinc-200/70 dark:bg-zinc-800/70 ${className}`}
    />
  );
}

export function FontCardSkeleton() {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/30 overflow-hidden flex flex-col">
      <div className="relative flex-1 min-h-[140px] px-4 pt-10 pb-4 flex items-center">
        <SkeletonLine className="h-9 w-3/4" />
      </div>
      <div className="border-t border-zinc-200/70 dark:border-zinc-800/60 px-3 py-2.5 flex items-center justify-between gap-2">
        <div className="flex-1 space-y-1.5">
          <SkeletonLine className="h-3 w-2/3" />
          <SkeletonLine className="h-2.5 w-1/2" />
        </div>
        <SkeletonLine className="h-6 w-16" />
      </div>
    </div>
  );
}

export function FontCardSkeletonGrid({ count = 9 }: { count?: number }) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <FontCardSkeleton key={i} />
      ))}
    </div>
  );
}
