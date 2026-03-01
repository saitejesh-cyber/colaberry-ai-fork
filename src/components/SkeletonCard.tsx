/**
 * SkeletonCard — shimmer loading placeholder for catalog grids.
 * Uses the `.skeleton-block` CSS class defined in globals.css.
 */

export default function SkeletonCard() {
  return (
    <div className="catalog-card p-5" aria-hidden="true">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div className="skeleton-block h-6 w-20" />
        <div className="skeleton-block h-4 w-4 rounded-full" />
      </div>

      {/* Title */}
      <div className="mt-3 space-y-2">
        <div className="skeleton-block h-5 w-3/4" />
        <div className="skeleton-block h-4 w-full" />
        <div className="skeleton-block h-4 w-5/6" />
      </div>

      {/* Chips */}
      <div className="mt-4 flex gap-2">
        <div className="skeleton-block h-6 w-16 rounded-md" />
        <div className="skeleton-block h-6 w-14 rounded-md" />
        <div className="skeleton-block h-6 w-12 rounded-md" />
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-zinc-200/60 pt-3 dark:border-zinc-700/50">
        <div className="skeleton-block h-3 w-32" />
        <div className="skeleton-block h-3 w-12" />
      </div>
    </div>
  );
}

/**
 * Render a grid of skeleton cards (default 6).
 */
export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </>
  );
}
