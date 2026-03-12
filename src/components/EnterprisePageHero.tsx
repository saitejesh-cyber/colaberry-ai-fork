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
  image?: string;
  alt?: string;
  imageKicker?: string;
  imageTitle?: string;
  imageDescription?: string;
  chips?: string[];
  primaryAction?: HeroAction;
  secondaryAction?: HeroAction;
  metrics?: HeroMetric[];
};

function ActionButton({ action }: { action: HeroAction }) {
  const className =
    action.variant === "secondary" ? "btn btn-secondary" : "btn btn-primary";
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
    <section className="hero-dot-grid relative overflow-hidden rounded-2xl bg-white dark:bg-[#09090B]">
      <div className={`relative z-10 grid gap-6 px-5 py-12 sm:px-8 sm:py-16 md:px-10 lg:items-start lg:px-14 lg:py-20${image ? " lg:grid-cols-[1.08fr_0.92fr]" : ""}`}>
        <div className="flex flex-col gap-4">
          <div className="rise-in rise-delay-1 inline-flex w-fit items-center gap-2.5 rounded-full border border-zinc-200 bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--trusted-fill)]" />
            </span>
            {kicker}
          </div>
          <h1 className="rise-in rise-delay-2 mt-2 font-sans text-display-sm font-bold text-zinc-900 dark:text-zinc-50 sm:text-display-md md:text-display-lg lg:text-display-xl">
            {title}
          </h1>
          <p className="rise-in rise-delay-3 max-w-2xl text-caption leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-lg">
            {description}
          </p>
          {chips.length > 0 ? (
            <div className="rise-in mt-1 flex flex-wrap gap-2" style={{ animationDelay: "0.24s" }}>
              {chips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-0.5 text-xs font-semibold text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400"
                >
                  {chip}
                </span>
              ))}
            </div>
          ) : null}
          {(primaryAction || secondaryAction) ? (
            <div className="rise-in mt-2 flex flex-col gap-3 sm:flex-row" style={{ animationDelay: "0.32s" }}>
              {primaryAction ? <ActionButton action={primaryAction} /> : null}
              {secondaryAction ? <ActionButton action={secondaryAction} /> : null}
            </div>
          ) : null}
        </div>

        {image ? (
          <div className="rise-in group relative overflow-hidden rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6" style={{ animationDelay: "0.2s" }}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--trusted-fill)]" />
                  {imageKicker}
                </div>
                <div className="mt-2 text-base font-bold leading-tight text-zinc-900 dark:text-zinc-50">{imageTitle}</div>
                <div className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{imageDescription}</div>
              </div>
            </div>
            <div className="relative mt-4 overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="relative aspect-[16/9]">
                <Image
                  src={image}
                  alt={alt ?? ""}
                  fill
                  sizes="(min-width: 1920px) 780px, (min-width: 1536px) 680px, (min-width: 1280px) 620px, (min-width: 1024px) 520px, 92vw"
                  quality={90}
                  className="object-cover transition duration-500 ease-out group-hover:scale-[1.02]"
                />
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {metrics.length > 0 ? (
        <div className="relative z-10 grid gap-3 px-6 pb-10 sm:grid-cols-3 sm:px-8 lg:px-10">
          {metrics.map((metric) => (
            <article
              key={metric.label}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500 dark:text-zinc-400">{metric.label}</div>
              <div className="mt-2 text-lg font-bold text-zinc-900 dark:text-zinc-50">{metric.value}</div>
              {metric.note ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{metric.note}</p> : null}
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
