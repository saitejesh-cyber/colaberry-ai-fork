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
    <div className={`surface-panel p-5 sm:p-6 ${className ?? ""}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div>
          {kicker ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/20 bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-brand-deep">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-aqua" />
              {kicker}
            </div>
          ) : null}
          <div className="mt-2 text-base font-semibold text-slate-900">{title}</div>
          {description ? <div className="mt-1 text-sm text-slate-600">{description}</div> : null}
        </div>
        <span className="rounded-full border border-slate-200/80 bg-white/85 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          Preview
        </span>
      </div>
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm">
        <div className={`relative ${aspectClass}`}>
          <Image
            src={image}
            alt={alt}
            fill
            sizes="(min-width: 1920px) 820px, (min-width: 1536px) 720px, (min-width: 1280px) 640px, (min-width: 1024px) 520px, 90vw"
            quality={90}
            className={`${fitClass} transition duration-500 ease-out`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-slate-900/20 via-slate-900/5 to-transparent" />
        </div>
      </div>
    </div>
  );
}
