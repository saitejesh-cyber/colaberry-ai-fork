import { useEffect, useMemo, useState } from "react";

type Segment = {
  start: number;
  end?: number | null;
  text: string;
};

type TranscriptTimelineProps = {
  segments: Segment[];
  audioRef: React.RefObject<HTMLAudioElement | null>;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "--:--";
  const total = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function TranscriptTimeline({ segments, audioRef }: TranscriptTimelineProps) {
  const [currentTime, setCurrentTime] = useState(0);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const handler = () => setCurrentTime(el.currentTime || 0);
    el.addEventListener("timeupdate", handler);
    return () => {
      el.removeEventListener("timeupdate", handler);
    };
  }, [audioRef]);

  const normalizedSegments = useMemo(() => {
    return segments
      .map((segment, index) => ({
        ...segment,
        start: Number(segment.start) || 0,
        end: segment.end != null ? Number(segment.end) : null,
        index,
      }))
      .filter((segment) => segment.text);
  }, [segments]);

  const activeIndex = useMemo(() => {
    for (let i = 0; i < normalizedSegments.length; i += 1) {
      const segment = normalizedSegments[i];
      const next = normalizedSegments[i + 1];
      const end = segment.end ?? next?.start ?? segment.start + 5;
      if (currentTime >= segment.start && currentTime < end) {
        return i;
      }
    }
    return -1;
  }, [currentTime, normalizedSegments]);

  const handleSeek = (start: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = start;
    el.play().catch(() => undefined);
  };

  return (
    <div className="space-y-3">
      {normalizedSegments.map((segment, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={`${segment.start}-${index}`}
            type="button"
            onClick={() => handleSeek(segment.start)}
            aria-label={`Jump to ${formatTime(segment.start)}`}
            aria-current={isActive ? "true" : undefined}
            className={`focus-ring group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition ${
              isActive
                ? "border-brand-blue/50 bg-brand-blue/5"
                : "border-slate-200/80 bg-white/80 hover:border-brand-blue/30"
            }`}
          >
            <span className="mt-0.5 shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
              {formatTime(segment.start)}
            </span>
            <span className="text-sm text-slate-700">{segment.text}</span>
          </button>
        );
      })}
    </div>
  );
}
