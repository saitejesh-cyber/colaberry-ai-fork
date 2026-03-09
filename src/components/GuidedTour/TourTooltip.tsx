import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TourStep, TourStepPlacement } from "./types";

type Props = {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  targetRect: DOMRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
};

type ResolvedPosition = {
  top: number;
  left: number;
  placement: TourStepPlacement;
};

const GAP = 14;
const MARGIN = 16;

function resolvePosition(
  target: DOMRect,
  tooltip: { width: number; height: number },
  preferred: TourStepPlacement,
): ResolvedPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let placement = preferred;
  if (placement === "auto") {
    const below = vh - target.bottom;
    const above = target.top;
    placement =
      below >= tooltip.height + GAP
        ? "bottom"
        : above >= tooltip.height + GAP
          ? "top"
          : "right";
  }

  let top = 0;
  let left = 0;

  switch (placement) {
    case "bottom":
      top = target.bottom + GAP;
      left = target.left + target.width / 2 - tooltip.width / 2;
      break;
    case "top":
      top = target.top - tooltip.height - GAP;
      left = target.left + target.width / 2 - tooltip.width / 2;
      break;
    case "right":
      top = target.top + target.height / 2 - tooltip.height / 2;
      left = target.right + GAP;
      break;
    case "left":
      top = target.top + target.height / 2 - tooltip.height / 2;
      left = target.left - tooltip.width - GAP;
      break;
  }

  // Clamp to viewport
  left = Math.max(MARGIN, Math.min(left, vw - tooltip.width - MARGIN));
  top = Math.max(MARGIN, Math.min(top, vh - tooltip.height - MARGIN));

  return { top, left, placement };
}

export default function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onPrev,
  onSkip,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [pos, setPos] = useState<ResolvedPosition | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !targetRect || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    setPos(
      resolvePosition(targetRect, { width: rect.width, height: rect.height }, step.placement),
    );
  }, [mounted, targetRect, step.placement]);

  if (!mounted) return null;

  const isLast = stepIndex === totalSteps - 1;
  const progress = ((stepIndex + 1) / totalSteps) * 100;

  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={`Tour step ${stepIndex + 1} of ${totalSteps}`}
      className="w-[min(92vw,380px)] rounded-xl border border-zinc-200/70 bg-white p-5 shadow-2xl dark:border-[#3F3F46] dark:bg-[#18181B]"
      style={{
        position: "fixed",
        zIndex: 86,
        top: pos ? `${pos.top}px` : "-9999px",
        left: pos ? `${pos.left}px` : "-9999px",
        animation: "tour-slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
    >
      {/* Arrow */}
      {pos && <TourArrow placement={pos.placement} />}

      {/* Step counter */}
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400 dark:text-[#A1A1AA]">
        Step {stepIndex + 1} of {totalSteps}
      </div>

      {/* Title */}
      <h3 className="mt-1 text-lg font-semibold text-zinc-900 dark:text-white">
        {step.title}
      </h3>

      {/* Description */}
      <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300">
        {step.description}
      </p>

      {/* Progress bar */}
      <div className="mt-4 h-1 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">
        <div
          className="h-full rounded-full bg-[#DC2626] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Controls */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-zinc-500 transition-colors hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Skip tour
        </button>
        <div className="flex gap-2">
          {stepIndex > 0 && (
            <button
              type="button"
              onClick={onPrev}
              className="inline-flex h-9 items-center rounded-full border border-zinc-200/70 px-3 text-sm font-semibold text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-[#3F3F46] dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Previous
            </button>
          )}
          <button
            type="button"
            onClick={onNext}
            className="inline-flex h-9 items-center rounded-full bg-[#DC2626] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#B91C1C]"
          >
            {isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function TourArrow({ placement }: { placement: TourStepPlacement }) {
  if (placement === "auto") return null;
  return (
    <span
      className={`tour-arrow tour-arrow--${placement}`}
      aria-hidden="true"
    />
  );
}
