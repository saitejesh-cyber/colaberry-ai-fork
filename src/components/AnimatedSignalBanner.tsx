import Link from "next/link";

type BannerVariant = "platform" | "catalog" | "resources" | "solutions";

type AnimatedSignalBannerProps = {
  variant: BannerVariant;
  kicker: string;
  title: string;
  description: string;
  primaryHref?: string;
  primaryLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export default function AnimatedSignalBanner({
  variant,
  kicker,
  title,
  description,
  primaryHref = "/request-demo",
  primaryLabel = "Request demo",
  secondaryHref = "/search",
  secondaryLabel = "Search catalog",
}: AnimatedSignalBannerProps) {
  return (
    <section
      className={`animated-signal-banner animated-signal-${variant} mt-12 overflow-hidden rounded-2xl border border-white/10`}
      aria-label="Colaberry platform signal banner"
    >
      <div className="animated-signal-grid" />
      <div className="animated-signal-orb animated-signal-orb-a" />
      <div className="animated-signal-orb animated-signal-orb-b" />
      <div className="animated-signal-orb animated-signal-orb-c" />
      <div className="animated-signal-noise" />

      <div className="relative z-10 grid gap-5 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1.18fr_0.82fr] lg:items-end lg:gap-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-cyan-100">
            <span className="animated-signal-dot" />
            {kicker}
          </div>
          <h2 className="mt-3 font-sans text-2xl font-semibold leading-tight text-white sm:text-3xl">
            {title}
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-200 sm:text-base">
            {description}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
          <Link href={primaryHref} className="btn btn-cta justify-center">
            {primaryLabel}
          </Link>
          <Link href={secondaryHref} className="btn border border-white/25 bg-white/10 text-white hover:bg-white/15 justify-center">
            {secondaryLabel}
          </Link>
        </div>
      </div>
    </section>
  );
}
