import { useEffect, useRef, useState } from "react";

type MetricCounterProps = {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  note?: string;
  /** Duration in ms. Defaults to 2000. */
  duration?: number;
};

export default function MetricCounter({
  value,
  suffix = "",
  prefix = "",
  label,
  note,
  duration = 2000,
}: MetricCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [display, setDisplay] = useState(0);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || hasAnimated.current) return;
        hasAnimated.current = true;

        if (prefersReducedMotion) {
          setDisplay(value);
          return;
        }

        const start = performance.now();
        const step = (now: number) => {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(eased * value));
          if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration]);

  return (
    <div ref={ref} className="text-center">
      <div className="text-display-sm font-sans font-bold text-[var(--text-primary)]">
        {prefix}
        {display.toLocaleString()}
        {suffix}
      </div>
      <div className="mt-1 text-sm font-semibold text-[var(--text-secondary)]">
        {label}
      </div>
      {note ? (
        <div className="mt-0.5 text-xs text-[var(--text-muted)]">{note}</div>
      ) : null}
    </div>
  );
}
