import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";
import { m, useScroll, useTransform, useReducedMotion } from "framer-motion";
import KineticHeading from "./KineticHeading";

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
  // Sprint v5 kinetic-pacing — scroll-linked parallax depth layers behind the
  // page hero. Mirrors the homepage PlatformTabsSection pattern so every page
  // gets the same "overlapping z-index + subtle drift" depth cue without
  // touching the content layout. Zinc + coral only (color-lock safe).
  const sectionRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });
  const grainY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [-10, 10]);
  const meshY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [-32, 32]);
  const coralY = useTransform(scrollYProgress, [0, 1], reduceMotion ? [0, 0] : [30, -30]);

  return (
    <section
      ref={sectionRef}
      className="hero-dot-grid relative isolate overflow-hidden rounded-2xl bg-zinc-50 dark:bg-[#09090B]"
    >
      {/* Parallax backdrop layers (decorative, aria-hidden). Stacked at
       * negative z-index so all hero content stays above them. */}
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-[-30] opacity-[0.035]"
        style={{
          y: grainY,
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
          backgroundRepeat: "repeat",
          backgroundSize: "256px 256px",
        }}
      />
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-16 z-[-20] opacity-60 dark:opacity-40"
        style={{
          y: meshY,
          background:
            "radial-gradient(ellipse at 15% 25%, rgba(161, 161, 170, 0.10) 0%, rgba(161, 161, 170, 0) 55%), radial-gradient(ellipse at 85% 70%, rgba(113, 113, 122, 0.08) 0%, rgba(113, 113, 122, 0) 60%)",
        }}
      />
      <m.div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-80px] top-[8%] z-[-10] h-[260px] w-[260px] rounded-full blur-3xl"
        style={{
          y: coralY,
          background:
            "radial-gradient(circle, rgba(220, 38, 38, 0.08) 0%, rgba(220, 38, 38, 0.02) 45%, transparent 70%)",
        }}
      />

      <div className={`relative z-10 grid gap-6 px-5 py-12 sm:px-8 sm:py-16 md:px-10 lg:items-start lg:px-14 lg:py-20${image ? " xl:grid-cols-[1.08fr_0.92fr]" : ""}`}>
        <div className="flex flex-col gap-4">
          <div className="rise-in rise-delay-1 inline-flex w-fit items-center gap-2.5 rounded-full border border-zinc-200 bg-zinc-100 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400">
            <span className="relative flex h-1.5 w-1.5 shrink-0">
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[var(--trusted-fill)]" />
            </span>
            {kicker}
          </div>
          {/* Sprint v5 kinetic-pacing: H1 rendered via KineticHeading for a
           * word-by-word line-mask reveal on every page that uses
           * EnterprisePageHero (16 pages). Keeps `rise-in rise-delay-2`
           * classes so the wrapper still participates in the existing
           * on-load stagger. The line-mask animates WITHIN the rise.
           *
           * Responsive: `text-pretty` + progressive `max-w` clamp so long
           * titles (e.g. "Discover, govern, and scale AI skills") don't
           * orphan on their own line at 768 / 1024 / 1280. Desktop gets
           * full width via `2xl:max-w-none`. */}
          <KineticHeading
            as="h1"
            text={title}
            className="rise-in rise-delay-2 mt-2 max-w-[22ch] font-sans text-display-sm font-bold text-zinc-900 text-pretty dark:text-zinc-50 sm:max-w-[28ch] sm:text-display-md md:text-display-lg lg:text-display-xl xl:max-w-[32ch] 2xl:max-w-none"
            duration={0.9}
            stagger={0.08}
          />
          <p className="rise-in rise-delay-3 max-w-2xl text-caption leading-relaxed text-zinc-500 text-pretty dark:text-zinc-400 sm:text-lg">
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
          <div className="rise-in group relative overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-800 dark:bg-zinc-900 sm:p-6" style={{ animationDelay: "0.2s" }}>
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
                  priority
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
        <div className="relative z-10 grid gap-3 px-6 pb-10 sm:grid-cols-2 sm:px-8 md:grid-cols-3 lg:px-10">
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
