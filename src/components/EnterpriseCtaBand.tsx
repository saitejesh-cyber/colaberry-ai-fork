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
      className={`footer-callout-panel mt-10 grid gap-5 rounded-[1.75rem] border border-slate-200/70 p-6 shadow-[0_24px_56px_rgba(15,23,42,0.14)] dark:border-slate-700/70 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:p-7 ${
        className ?? ""
      }`}
    >
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/35 bg-slate-950/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
          {kicker}
        </div>
        <h2 className="mt-3 text-2xl font-semibold leading-tight text-white sm:text-3xl">{title}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">{description}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <Link href={primaryHref} className="btn btn-primary h-10 justify-center text-sm">
          {primaryLabel}
        </Link>
        <Link
          href={secondaryHref}
          className="btn h-10 justify-center border border-white/35 bg-white/90 text-sm text-slate-900 hover:bg-white"
        >
          {secondaryLabel}
        </Link>
      </div>
    </section>
  );
}
