import { ReactNode } from "react";

type SectionHeaderProps = {
  kicker?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  size?: "md" | "lg" | "xl";
  as?: "h1" | "h2" | "h3";
  gradient?: boolean;
  children?: ReactNode;
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
}: SectionHeaderProps) {
  const HeadingTag = as;
  const titleClass =
    size === "xl"
      ? "text-display-lg sm:text-display-xl lg:text-display-2xl"
      : size === "lg"
        ? "text-display-sm sm:text-display-md lg:text-display-lg"
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

  return (
    <div className={`flex w-full max-w-4xl flex-col ${spacingClass} ${alignClass}`}>
      {kicker ? (
        <div
          className={`inline-flex w-fit items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-label font-semibold uppercase tracking-[0.14em] text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 ${kickerAlign}`}
        >
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-[#DC2626]" />
          <span>{kicker}</span>
        </div>
      ) : null}
      <HeadingTag className={`font-sans font-bold text-zinc-900 dark:text-zinc-50 ${titleClass} ${gradient ? "text-gradient" : ""}`}>
        {title}
      </HeadingTag>
      {description ? (
        <p className={descriptionClass}>{description}</p>
      ) : null}
      {children ? <div className="pt-1">{children}</div> : null}
    </div>
  );
}
