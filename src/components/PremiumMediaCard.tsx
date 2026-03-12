import Image from "next/image";
import Link from "next/link";
import { ReactNode, useState } from "react";

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
  const [imgError, setImgError] = useState(false);
  const isExternal = external || (!!href && /^https?:\/\//i.test(href));
  const minHeightClass = size === "sm" ? "min-h-[246px]" : "min-h-[286px]";
  const aspectClass = size === "sm" ? "aspect-[16/9]" : "aspect-[16/10]";
  const rootClass = [
    "surface-panel surface-hover surface-interactive group flex h-full flex-col overflow-hidden border border-zinc-200 bg-white p-0 dark:border-zinc-800 dark:bg-zinc-900",
    minHeightClass,
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      <div className="media-premium-frame border-0 border-b border-zinc-200 dark:border-zinc-800 rounded-none">
        <div className={`relative w-full ${aspectClass}`}>
          {imgError ? (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800">
              <svg viewBox="0 0 24 24" className="h-10 w-10 text-zinc-300 dark:text-zinc-600" fill="none" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor" />
                <path d="m6 16 3.5-4.5 2.5 3 3.5-4.5L21 16" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              </svg>
            </div>
          ) : (
            <Image
              src={image}
              alt={alt ?? title}
              fill
              sizes="(min-width: 1536px) 28vw, (min-width: 1024px) 32vw, (min-width: 640px) 44vw, 95vw"
              quality={90}
              className="media-premium-image object-cover object-center"
              onError={() => setImgError(true)}
            />
          )}
          <div className="media-premium-overlay" />
          {kicker ? (
            <div className="absolute left-3 top-3">
              <div className="rounded-full border border-zinc-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 backdrop-blur dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:text-zinc-300">
                {kicker}
              </div>
            </div>
          ) : null}
          {meta ? (
            <div className="absolute right-3 top-3">
              <div className="rounded-full border border-zinc-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 backdrop-blur dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:text-zinc-300">
                {meta}
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex flex-1 items-start justify-between gap-4 p-6">
        <div>
          <div className="text-base font-semibold leading-tight text-zinc-900 dark:text-zinc-50">{title}</div>
          <div className="mt-1.5 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">{description}</div>
        </div>
        <div className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-400 transition-colors group-hover:border-zinc-300 group-hover:text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:group-hover:text-zinc-200">
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
