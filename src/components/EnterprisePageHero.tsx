import Image from "next/image";
import Link from "next/link";

type HeroAction = {
  label: string;
  href: string;
  external?: boolean;
  variant?: "primary" | "secondary";
};

type HeroMetric = {
  label: string;
  value: string;
  note?: string;
};

type EnterprisePageHeroProps = {
  kicker: string;
  title: string;
  description: string;
  image: string;
  alt: string;
  imageKicker?: string;
  imageTitle?: string;
  imageDescription?: string;
  chips?: string[];
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  metrics?: HeroMetric[];
};

function ActionButton({ action }: { action: HeroAction }) {
  const className = action.variant === "secondary" ? "btn btn-secondary" : "btn btn-primary";
  const isExternal = action.external || /^https?:\/\//i.test(action.href);
  if (isExternal) {
    return (
      <a href={action.href} target="_blank" rel="noreferrer" className={className}>
        {action.label}
      </a>
    );
  }
  return (
    <Link href={action.href} className={className}>
      {action.label}
    </Link>
  );
}

export default function EnterprisePageHero({
  kicker,
  title,
  description,
  image,
  alt,
  imageKicker = "Preview",
  imageTitle = "Signal surface",
  imageDescription = "A premium visual preview for this page.",
  chips = [],
  primaryAction,
  secondaryAction,
  metrics = [],
}: EnterprisePageHeroProps) {
  return (
    <section className="hero-surface p-6 sm:p-8 lg:p-10">
      <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
        <div className="flex flex-col gap-4">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-brand-blue/15 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-brand-deep dark:border-brand-teal/20 dark:bg-slate-800/60 dark:text-brand-ice">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-aqua" />
            {kicker}
          </div>
          <h1 className="font-display text-3xl font-bold leading-[1.06] text-slate-900 dark:text-slate-100 sm:text-4xl lg:text-[2.75rem]">
            {title}
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-600 dark:text-slate-400 sm:text-lg">
            {description}
          </p>
          {chips.length > 0 ? (
            <div className="mt-1 flex flex-wrap gap-2">
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-slate-200/60 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:border-slate-700/30 dark:bg-slate-800/60 dark:text-slate-300"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
          {(primaryAction || secondaryAction) ? (
            <div className="mt-2 flex flex-col gap-3 sm:flex-row">
              {primaryAction ? <ActionButton action={primaryAction} /> : null}
              {secondaryAction ? <ActionButton action={secondaryAction} /> : null}
            </div>
          ) : null}
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-slate-200/40 bg-slate-50 p-5 shadow-sm sm:p-6 dark:border-slate-700/20 dark:bg-slate-800/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/15 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep dark:border-brand-teal/20 dark:bg-slate-800/60 dark:text-brand-ice">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-aqua" />
                {imageKicker}
              </div>
              <div className="mt-2 text-base font-bold leading-tight text-slate-900 dark:text-slate-100">{imageTitle}</div>
              <div className="mt-1.5 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{imageDescription}</div>
            </div>
          </div>
          <div className="relative mt-4 overflow-hidden rounded-xl border border-slate-200/30 shadow-sm dark:border-slate-700/15">
            <div className="relative aspect-[16/9]">
              <Image
                src={image}
                alt={alt}
                fill
                sizes="(min-width: 1920px) 780px, (min-width: 1536px) 680px, (min-width: 1280px) 620px, (min-width: 1024px) 520px, 92vw"
                quality={90}
                className="object-cover transition duration-500 ease-out group-hover:scale-[1.02]"
              />
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-950/25 to-transparent" />
            </div>
          </div>
        </div>
      </div>

      {metrics.length > 0 ? (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-xl border border-slate-200/40 bg-slate-50 p-4 dark:border-slate-700/20 dark:bg-slate-800/40"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{metric.label}</div>
              <div className="mt-2 text-lg font-bold text-slate-900 dark:text-slate-100">{metric.value}</div>
              {metric.note ? <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metric.note}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
