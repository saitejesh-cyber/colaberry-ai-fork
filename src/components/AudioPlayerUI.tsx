import { useEffect, useRef, useState } from "react";

type AudioPlayerUIProps = {
  src: string;
  title?: string;
  onPlay?: () => void;
  audioRef?: React.RefObject<HTMLAudioElement | null>;
  forwardSkipSeconds?: number;
  className?: string;
};

const SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioPlayerUI({
  src,
  title,
  onPlay,
  audioRef: externalRef,
  forwardSkipSeconds = 15,
  className,
}: AudioPlayerUIProps) {
  const internalRef = useRef<HTMLAudioElement>(null);
  const resolvedRef = externalRef ?? internalRef;
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const hasFiredPlay = useRef(false);

  /* Sync state from audio element */
  useEffect(() => {
    const audio = resolvedRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onLoaded = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);
    const onPlayEvent = () => setPlaying(true);
    const onPauseEvent = () => setPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("durationchange", onLoaded);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlayEvent);
    audio.addEventListener("pause", onPauseEvent);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("durationchange", onLoaded);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlayEvent);
      audio.removeEventListener("pause", onPauseEvent);
    };
  }, [resolvedRef]);

  const togglePlay = () => {
    const audio = resolvedRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play();
      setPlaying(true);
      if (!hasFiredPlay.current) {
        hasFiredPlay.current = true;
        onPlay?.();
      }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  const skip = (delta: number) => {
    const audio = resolvedRef.current;
    if (!audio) return;
    audio.currentTime = Math.max(0, Math.min(audio.currentTime + delta, audio.duration || 0));
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = resolvedRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    audio.currentTime = ratio * duration;
  };

  const cycleSpeed = () => {
    const audio = resolvedRef.current;
    if (!audio) return;
    const idx = SPEEDS.indexOf(speed as (typeof SPEEDS)[number]);
    const next = SPEEDS[(idx + 1) % SPEEDS.length];
    audio.playbackRate = next;
    setSpeed(next);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = resolvedRef.current;
    if (!audio) return;
    const v = parseFloat(e.target.value);
    audio.volume = v;
    setVolume(v);
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className={className ?? "surface-panel rounded-xl border border-[var(--stroke)] p-4"}>
      <audio ref={resolvedRef} src={src} preload="metadata" />

      {title ? (
        <div className="mb-3 text-sm font-semibold text-[var(--text-primary)] line-clamp-1">
          {title}
        </div>
      ) : null}

      {/* Progress bar */}
      <div
        ref={progressRef}
        role="slider"
        aria-label="Seek"
        aria-valuenow={Math.round(currentTime)}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        tabIndex={0}
        className="group relative h-2 cursor-pointer rounded-full bg-[var(--surface-soft)]"
        onClick={seek}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") skip(5);
          else if (e.key === "ArrowLeft") skip(-5);
        }}
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-[var(--pivot-fill)] transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[#DC2626] opacity-0 shadow transition-opacity group-hover:opacity-100"
          style={{ left: `${progress}%` }}
        />
      </div>

      {/* Time display */}
      <div className="mt-1.5 flex justify-between text-xs text-[var(--text-muted)]">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>

      {/* Controls */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Skip back 15s */}
          <button
            type="button"
            onClick={() => skip(-15)}
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
            aria-label="Skip back 15 seconds"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 4v6h6" />
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center pt-0.5 text-[7px] font-bold leading-none">15</span>
          </button>

          {/* Play/Pause */}
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white shadow-md transition-transform hover:scale-105 dark:bg-zinc-100 dark:text-zinc-900"
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Skip forward */}
          <button
            type="button"
            onClick={() => skip(forwardSkipSeconds)}
            className="relative flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)]"
            aria-label={`Skip forward ${forwardSkipSeconds} seconds`}
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center pt-0.5 text-[7px] font-bold leading-none">{forwardSkipSeconds}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {/* Speed */}
          <button
            type="button"
            onClick={cycleSpeed}
            className="rounded-md border border-[var(--stroke)] px-2 py-1 text-xs font-semibold text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-soft)]"
            aria-label={`Playback speed ${speed}x`}
          >
            {speed}x
          </button>

          {/* Volume */}
          <label className="hidden items-center gap-1.5 sm:flex">
            <span className="sr-only">Volume</span>
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-[var(--text-muted)]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
              {volume > 0 && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
              {volume > 0.5 && <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />}
            </svg>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={changeVolume}
              className="h-1 w-16 cursor-pointer accent-[var(--pivot-fill)]"
            />
          </label>
        </div>
      </div>
    </div>
  );
}
