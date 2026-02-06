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
    <div className={`surface-panel p-4 sm:p-5 ${className ?? ""}`.trim()}>
      {kicker ? (
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          {kicker}
        </div>
      ) : null}
      <div className="mt-2 text-base font-semibold text-slate-900">{title}</div>
      {description ? <div className="mt-1 text-sm text-slate-600">{description}</div> : null}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/80 shadow-sm">
        <div className={`relative ${aspectClass}`}>
          <Image
            src={image}
            alt={alt}
            fill
            sizes="(min-width: 1280px) 520px, (min-width: 1024px) 460px, 90vw"
            className={`${fitClass} transition duration-500 ease-out`}
          />
        </div>
      </div>
    </div>
  );
}
