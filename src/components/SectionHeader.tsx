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

  return (
    <div className={`flex w-full max-w-3xl flex-col gap-2 ${alignClass}`}>
      {kicker ? (
        <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
          {kicker}
        </div>
      ) : null}
      <HeadingTag className={`font-semibold text-slate-900 ${titleClass}`}>{title}</HeadingTag>
      {description ? (
        <p className="text-sm text-slate-600 sm:text-base">{description}</p>
      ) : null}
      {children ? <div className="pt-1">{children}</div> : null}
    </div>
  );
}
