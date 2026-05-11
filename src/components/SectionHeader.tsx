import { ReactNode } from "react";
import KineticHeading from "./KineticHeading";

type SectionHeaderProps = {
  kicker?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  size?: "md" | "lg" | "xl";
  as?: "h1" | "h2" | "h3";
  gradient?: boolean;
  children?: ReactNode;
  /** Set false to disable scroll-reveal animation (e.g. when inside a parent that already animates). Default true. */
  animate?: boolean;
  /**
   * Opt the heading into the editorial left-to-right clip-path wipe
   * (Sprint v5 kinetic-pacing). Reserved for flagship H2s on the homepage —
   * too loud for dense listing pages. Underlying HTML still contains full
   * crawlable text pre-hydration (AEO-safe).
   */
  wipeTitle?: boolean;
};

export default function SectionHeader({
  kicker,
  title,
  description,
  align = "left",
  size = "lg",
  as = "h2",
  gradient = false,
  children,
  animate = true,
  wipeTitle = false,
}: SectionHeaderProps) {
  const HeadingTag = as;
  const titleClass =
    size === "xl"
      ? "text-display-md sm:text-display-lg md:text-display-xl lg:text-display-2xl"
      : size === "lg"
        ? "text-display-xs sm:text-display-sm md:text-display-md lg:text-display-lg"
        : "text-lg sm:text-xl font-semibold";
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";
  const spacingClass = size === "xl" ? "gap-5" : "gap-3";
  const kickerAlign = align === "center" ? "justify-center" : "justify-start";
  const descriptionClass =
    size === "xl"
      ? "max-w-3xl text-base leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-lg"
      : size === "lg"
        ? "max-w-3xl text-caption leading-relaxed text-zinc-500 dark:text-zinc-400 sm:text-base"
        : "max-w-3xl text-sm leading-relaxed text-zinc-500 dark:text-zinc-400";

  const r = animate ? "reveal" : "";
  // wipeTitle takes precedence over the generic animate flag because the two
  // target different elements (the title vs. the wrapper). Keeping wipeTitle
  // independent means a parent can animate={false} while still opting the
  // title into the editorial wipe.
  const rd1 = wipeTitle
    ? "reveal-wipe"
    : animate
      ? "reveal reveal-delay-1"
      : "";
  const rd2 = animate ? "reveal reveal-delay-2" : "";
  const rd3 = animate ? "reveal reveal-delay-3" : "";

  return (
    <div className={`flex w-full flex-col ${spacingClass} ${alignClass}`}>
      {kicker ? (
        <div
          className={`${r} inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-label font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 ${kickerAlign}`}
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
          <span>{kicker}</span>
        </div>
      ) : null}
      {as === "h1" && !wipeTitle ? (
        // Sprint v5 kinetic-pacing — route H1 titles through KineticHeading so
        // every page that uses SectionHeader as="h1" (29 pages) inherits the
        // word-by-word line-mask reveal. Preserves the `rd1` className flow
        // (reveal / reveal-delay-1) so IntersectionObserver staging still
        // participates in the cascade. Server-renders the full title in an
        // sr-only span for AEO crawlability. `wipeTitle` is still respected
        // (reserved for flagship H2s, but if a consumer ever opts an H1 into
        // the editorial wipe we defer to that intent).
        <KineticHeading
          as="h1"
          text={title}
          className={`${rd1} font-sans font-bold text-zinc-900 dark:text-zinc-50 ${titleClass} ${gradient ? "text-gradient" : ""}`}
          duration={0.9}
          stagger={0.08}
        />
      ) : (
        <HeadingTag className={`${rd1} font-sans font-bold text-zinc-900 dark:text-zinc-50 ${titleClass} ${gradient ? "text-gradient" : ""}`}>
          {title}
        </HeadingTag>
      )}
      {description ? (
        <p className={`${rd2} ${descriptionClass}`}>{description}</p>
      ) : null}
      {children ? <div className={`${rd3} pt-1`}>{children}</div> : null}
    </div>
  );
}
