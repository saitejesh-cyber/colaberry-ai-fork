import { ReactNode } from "react";

type SectionHeaderProps = {
  kicker?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  size?: "md" | "lg" | "xl";
  as?: "h1" | "h2" | "h3";
  children?: ReactNode;
};

export default function SectionHeader({
  kicker,
  title,
  description,
  align = "left",
  size = "lg",
  as = "h2",
  children,
}: SectionHeaderProps) {
  const HeadingTag = as;
  const titleClass =
    size === "xl"
      ? "text-4xl sm:text-5xl lg:text-6xl"
      : size === "lg"
        ? "text-2xl sm:text-3xl lg:text-4xl"
        : "text-xl sm:text-2xl";
  const alignClass = align === "center" ? "items-center text-center" : "items-start text-left";
  const spacingClass = size === "xl" ? "gap-3" : "gap-2";
  const kickerAlign = align === "center" ? "justify-center" : "justify-start";

  return (
    <div className={`flex w-full max-w-3xl flex-col ${spacingClass} ${alignClass}`}>
      {kicker ? (
        <div className={`flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500 ${kickerAlign}`}>
          <span
            aria-hidden="true"
            className="h-[2px] w-10 rounded-full bg-gradient-to-r from-brand-ink to-brand-teal"
          />
          <span>{kicker}</span>
        </div>
      ) : null}
      <HeadingTag className={`font-semibold leading-tight tracking-tight text-slate-900 ${titleClass}`}>
        {title}
      </HeadingTag>
      {description ? (
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">{description}</p>
      ) : null}
      {children ? <div className="pt-1">{children}</div> : null}
    </div>
  );
}
