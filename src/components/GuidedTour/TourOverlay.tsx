import { useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  targetRect: DOMRect | null;
  onClickBackdrop: () => void;
};

export default function TourOverlay({ targetRect, onClickBackdrop }: Props) {
  const [mounted] = useState(() => typeof document !== "undefined");
  if (!mounted) return null;

  const pad = 8;
  const r = targetRect;

  return createPortal(
    <svg
      className="tour-overlay-enter h-full w-full"
      style={{ position: "fixed", inset: 0, zIndex: 85, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <defs>
        <mask id="tour-spotlight">
          <rect x="0" y="0" width="100%" height="100%" fill="white" />
          {r && (
            <rect
              x={r.x - pad}
              y={r.y - pad}
              width={r.width + pad * 2}
              height={r.height + pad * 2}
              rx="8"
              fill="black"
            />
          )}
        </mask>
      </defs>
      <rect
        x="0"
        y="0"
        width="100%"
        height="100%"
        fill="rgba(9, 9, 11, 0.5)"
        mask="url(#tour-spotlight)"
        style={{ pointerEvents: "auto", cursor: "pointer" }}
        onClick={onClickBackdrop}
      />
    </svg>,
    document.body,
  );
}
