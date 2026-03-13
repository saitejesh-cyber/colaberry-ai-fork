/**
 * CatalogSnapshot — Enterprise-grade stats banner for catalog listing pages.
 *
 * Renders a dark, full-width panel with large hero metrics, subtle grid texture,
 * and a coral accent line. Replaces the old inline surface-panel + Stat pattern.
 */

export type SnapshotStat = {
  label: string;
  value: string | number;
  note: string;
};

type CatalogSnapshotProps = {
  /** Array of 2-4 stat objects */
  stats: SnapshotStat[];
  /** Optional accent color override (defaults to coral #DC2626) */
  accent?: string;
};

export default function CatalogSnapshot({ stats, accent = "#DC2626" }: CatalogSnapshotProps) {
  return (
    <section className="reveal mt-8 sm:mt-10">
      <div className="relative overflow-hidden rounded-2xl bg-zinc-900 dark:bg-zinc-950">
        {/* Subtle grid pattern overlay */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Coral accent line at top */}
        <div
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${accent}, ${accent}80, transparent)` }}
        />

        {/* Content */}
        <div className="relative px-6 py-7 sm:px-8 sm:py-9">
          {/* Stats grid */}
          <div
            className={`grid gap-px overflow-hidden rounded-xl bg-white/[0.06] ${
              stats.length <= 2 ? "sm:grid-cols-2" : stats.length === 3 ? "sm:grid-cols-3" : "sm:grid-cols-4"
            }`}
          >
            {stats.map((stat, i) => (
              <div
                key={stat.label}
                className={`group relative bg-zinc-900 px-5 py-5 transition-colors hover:bg-zinc-800/80 dark:bg-zinc-950 dark:hover:bg-zinc-900/80 sm:px-6 sm:py-6 ${
                  i === 0 ? "rounded-t-xl sm:rounded-l-xl sm:rounded-tr-none" : ""
                } ${i === stats.length - 1 ? "rounded-b-xl sm:rounded-r-xl sm:rounded-bl-none" : ""}`}
              >
                {/* Stat label */}
                <div className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                  {stat.label}
                </div>

                {/* Stat value — large hero number */}
                <div className="mt-2 font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {stat.value}
                </div>

                {/* Stat note */}
                <div className="mt-1.5 text-xs leading-relaxed text-zinc-500">
                  {stat.note}
                </div>

                {/* Subtle hover accent dot */}
                <div
                  className="absolute right-4 top-4 h-1.5 w-1.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ backgroundColor: accent }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
