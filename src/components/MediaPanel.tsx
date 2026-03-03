import Image from "next/image";

type MediaPanelProps = {
  kicker?: string;
  title: string;
  description?: string;
  image: string;
  alt: string;
  aspect?: "square" | "video" | "wide";
  fit?: "cover" | "contain";
  className?: string;
};

const ASPECT_CLASSES: Record<NonNullable<MediaPanelProps["aspect"]>, string> = {
  square: "aspect-square",
  video: "aspect-[4/3]",
  wide: "aspect-[16/9]",
};

export default function MediaPanel({
  kicker,
  title,
  description,
  image,
  alt,
  aspect = "video",
  fit = "contain",
  className,
}: MediaPanelProps) {
  const aspectClass = ASPECT_CLASSES[aspect];
  const fitClass = fit === "contain" ? "object-contain p-3 sm:p-4" : "object-cover";

  return (
    <div className={`surface-panel group relative overflow-hidden p-5 sm:p-6 ${className ?? ""}`.trim()}>
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-brand-teal-300/20 blur-3xl" />
      <div className="flex items-start justify-between gap-3">
        <div>
          {kicker ? (
            <div className="inline-flex items-center gap-2 rounded-md border border-brand-purple-600/20 bg-white/90 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-deep dark:border-brand-purple-400/30 dark:bg-zinc-900/90 dark:text-brand-teal-100">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-aqua" />
              {kicker}
            </div>
          ) : null}
          <div className="mt-2 text-lg font-semibold leading-tight text-zinc-900 dark:text-zinc-100">{title}</div>
          {description ? <div className="mt-1.5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">{description}</div> : null}
        </div>
        <span className="rounded-md border border-zinc-200/80 bg-white/90 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:border-zinc-700/80 dark:bg-zinc-900/90 dark:text-zinc-300">
          Preview
        </span>
      </div>
      <div className="relative mt-4 overflow-hidden rounded-lg border border-zinc-200/80 bg-white/80 shadow-sm dark:border-zinc-700/80">
        <div className={`relative ${aspectClass}`}>
          <Image
            src={image}
            alt={alt}
            fill
            sizes="(min-width: 1920px) 820px, (min-width: 1536px) 720px, (min-width: 1280px) 640px, (min-width: 1024px) 520px, 90vw"
            quality={90}
            className={`${fitClass} transition duration-700 ease-out group-hover:scale-[1.03]`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-zinc-950/35 via-zinc-900/8 to-transparent" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_18%,rgba(0,142,168,0.18),transparent_48%)]" />
        </div>
      </div>
    </div>
  );
}
