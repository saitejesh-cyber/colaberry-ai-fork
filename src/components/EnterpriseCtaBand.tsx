import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

type EnterpriseCtaBandProps = {
  kicker: string;
  title: string;
  description: string;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref: string;
  secondaryLabel: string;
  className?: string;
};

/**
 * Enterprise CTA Band — Sprint v5.3 "Global Enterprise" pass.
 *
 * Design-system contract (see :root enterprise tokens in globals.css):
 * - Surface: solid obsidian (var(--enterprise-surface), #0A0A0A).
 *   No gradient ground — the old red-to-dark gradient muddied the text.
 * - Brand punch: ONE soft coral radial blur anchored top-left at ~15%
 *   opacity, high-blur. Enough to signal the brand without competing
 *   with the content.
 * - Hairline edge glow: 1px top rim + ambient coral outline below the
 *   shell — the "edge glow" the brief called for.
 * - Typography: Inter (project-locked), tracking-tight H2, muted body in
 *   var(--enterprise-text-muted) (zinc-400 — the locked cool-neutral for
 *   subtext against the obsidian surface).
 * - Padding: uniform p-8 sm:p-12. Same on every breakpoint, same on both
 *   banner instances — the "standardize across banners" requirement.
 * - Buttons: solid high-contrast coral primary (no layered glow chrome)
 *   + true ghost secondary (transparent, white/20 border, no fill).
 */
export default function EnterpriseCtaBand({
  kicker,
  title,
  description,
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
  className,
}: EnterpriseCtaBandProps) {
  return (
    <section
      className={`reveal cta-band-enterprise relative isolate mt-6 overflow-hidden rounded-2xl border border-white/10 p-8 sm:p-12 ${
        className ?? ""
      }`}
    >
      {/* Single top-left soft coral radial — the "edge glow" anchor.
       * ~15% opacity, large radius, heavy blur. aria-hidden, decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 -top-32 -z-10 h-[420px] w-[420px] rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(220, 38, 38, 0.15) 0%, rgba(220, 38, 38, 0.06) 40%, rgba(220, 38, 38, 0) 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* 1px top rim highlight — the glass edge the enterprise deck asked
       * for. White gradient fades at both ends so it reads as a lit rim
       * instead of a hairline. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-px"
        style={{
          background:
            "linear-gradient(to right, rgba(255,255,255,0) 0%, rgba(255,255,255,0.14) 50%, rgba(255,255,255,0) 100%)",
        }}
      />

      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          {/* Kicker pill — minimal glass chip, coral sparkle accent. */}
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-label font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-md">
            <Sparkles aria-hidden="true" className="h-3 w-3 text-[#F87171]" strokeWidth={2.5} />
            {kicker}
          </div>

          {/* Title — tracking-tight, pure white, generous scale. */}
          <h2 className="mt-5 font-sans text-display-xs font-bold tracking-tight text-white sm:text-display-sm lg:text-display-md">
            {title}
          </h2>

          {/* Body — muted zinc-400 for cool-neutral subtext contrast
           * against the obsidian surface, relaxed line-height for editorial
           * rhythm. */}
          <p className="mt-4 max-w-2xl text-sm leading-[1.75] text-zinc-400 sm:text-base">
            {description}
          </p>
        </div>

        {/* Button column — solid primary, ghost secondary. Clear hierarchy. */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Link
            href={primaryHref}
            className="btn btn-cta cta-band-primary group h-11 justify-center text-sm font-semibold"
          >
            <span>{primaryLabel}</span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 transition-transform duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5"
              strokeWidth={2.25}
            />
          </Link>
          <Link
            href={secondaryHref}
            className="btn cta-band-secondary group h-11 justify-center text-sm font-semibold"
          >
            <span>{secondaryLabel}</span>
            <ArrowRight
              aria-hidden="true"
              className="h-4 w-4 opacity-70 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:opacity-100"
              strokeWidth={2.25}
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
