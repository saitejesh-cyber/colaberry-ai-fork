import Link from "next/link";

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
      className={`reveal cta-band-enterprise mt-6 grid gap-6 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-700 sm:p-6 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:p-8 ${
        className ?? ""
      }`}
    >
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-label font-semibold uppercase tracking-[0.18em] text-white/90">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
          {kicker}
        </div>
        <h2 className="font-sans mt-4 text-display-xs font-bold leading-tight text-white sm:text-display-sm">{title}</h2>
        <p className="mt-3 max-w-2xl text-caption leading-relaxed text-white/70 sm:text-base">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <Link href={primaryHref} className="btn btn-cta h-11 justify-center text-sm font-semibold">
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="btn h-11 justify-center border border-white/20 bg-white/90 text-sm font-semibold text-zinc-900 hover:bg-white"
        >
          {secondaryLabel}
        </Link>
      </div>
    </section>
  );
}
