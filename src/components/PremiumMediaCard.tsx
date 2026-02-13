import Image from "next/image";
import Link from "next/link";
import { ReactNode } from "react";

type PremiumMediaCardProps = {
  href?: string;
  title: string;
  description: string;
  image: string;
  alt?: string;
  meta?: string;
  kicker?: string;
  external?: boolean;
  size?: "sm" | "md";
  className?: string;
  trailing?: ReactNode;
};

export default function PremiumMediaCard({
  href,
  title,
  description,
  image,
  alt,
  meta,
  kicker,
  external,
  size = "md",
  className,
  trailing,
}: PremiumMediaCardProps) {
  const isExternal = external || (!!href && /^https?:\/\//i.test(href));
  const minHeightClass = size === "sm" ? "min-h-[236px]" : "min-h-[270px]";
  const aspectClass = size === "sm" ? "aspect-[16/9]" : "aspect-[16/10]";
  const rootClass = [
    "surface-panel surface-hover surface-interactive group flex h-full flex-col overflow-hidden border border-slate-200/80 bg-white/90 p-0",
    minHeightClass,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className="media-premium-frame border-0 border-b border-slate-200/80 rounded-none">
        <div className={`relative w-full ${aspectClass}`}>
          <Image
            src={image}
            alt={alt ?? title}
            fill
            sizes="(min-width: 1536px) 28vw, (min-width: 1024px) 32vw, (min-width: 640px) 44vw, 95vw"
            quality={90}
            className="media-premium-image object-cover object-center"
          />
          <div className="media-premium-overlay" />
          {kicker ? (
            <div className="absolute left-3 top-3">
              <div className="chip chip-brand rounded-full border border-brand-blue/20 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-brand-deep">
                {kicker}
              </div>
            </div>
          ) : null}
          {meta ? (
            <div className="absolute right-3 top-3">
              <div className="chip chip-muted rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-700">
                {meta}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 items-start justify-between gap-4 p-5">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
          <div className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{description}</div>
        </div>
        <div className="mt-0.5 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-deep">
          {trailing ?? <span aria-hidden="true">→</span>}
        </div>
      </div>
    </>
  );

  if (!href) {
    return <div className={rootClass}>{content}</div>;
  }

  if (isExternal) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={rootClass} aria-label={`Open ${title}`}>
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={rootClass} aria-label={`Open ${title}`}>
      {content}
    </Link>
  );
}
